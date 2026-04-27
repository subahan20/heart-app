-- ==========================================
-- 081_daily_tracking_profile_aware.sql
-- Ensure daily tracking is isolated per profile (family member)
-- ==========================================

-- 1. Add patient_id column
ALTER TABLE public.daily_tracking ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);

-- 2. Backfill existing rows (Assign to the primary/first profile of each user)
UPDATE public.daily_tracking d
SET patient_id = (SELECT id FROM public.patient_details p WHERE (p.user_id = d.user_id OR p.guest_session_id = d.guest_session_id) LIMIT 1)
WHERE d.patient_id IS NULL;

-- 3. Modify Unique Constraint
-- First drop the old account-wide constraint
ALTER TABLE public.daily_tracking DROP CONSTRAINT IF EXISTS daily_tracking_user_date_unique;

-- Add the new profile-aware constraint
-- (patient_id, date) is now the unique key for tracking
ALTER TABLE public.daily_tracking ADD CONSTRAINT daily_tracking_profile_date_unique 
    UNIQUE NULLS NOT DISTINCT (patient_id, date);

-- 4. Update populate_daily_tracking function
-- This now seeds a row for EVERY patient profile, not just every account
CREATE OR REPLACE FUNCTION public.populate_daily_tracking()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.daily_tracking (
        user_id, 
        guest_session_id, 
        patient_id, 
        date,
        diet_reminder_limit,
        exercise_reminder_limit,
        sleep_reminder_limit,
        water_reminder_limit,
        mental_reminder_limit
    )
    SELECT 
        pd.user_id, 
        pd.guest_session_id, 
        pd.id, 
        CURRENT_DATE,
        floor(random() * 6 + 5)::INT,   -- 5–10
        floor(random() * 6 + 5)::INT,
        floor(random() * 6 + 5)::INT,
        floor(random() * 6 + 5)::INT,
        floor(random() * 6 + 5)::INT
    FROM public.patient_details pd
    WHERE pd.user_id IS NOT NULL 
    ON CONFLICT (patient_id, date) DO NOTHING;
END;
$$;

-- 5. ATOMIC helper: increment a task's reminder counter (Profile-Aware)
CREATE OR REPLACE FUNCTION public.increment_task_reminder(
    p_patient_id UUID,
    p_date       DATE,
    p_task       TEXT,
    p_user_id    UUID DEFAULT NULL,
    p_guest_id   TEXT DEFAULT NULL
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sent_col  TEXT;
    v_limit_col TEXT;
    v_sent      INT;
    v_limit     INT;
    v_new_sent  INT;
BEGIN
    IF p_task NOT IN ('diet', 'exercise', 'sleep', 'water', 'mental') THEN
        RAISE EXCEPTION 'Invalid task: %', p_task;
    END IF;

    v_sent_col  := p_task || '_reminders_sent';
    v_limit_col := p_task || '_reminder_limit';

    -- Read current values with Row-Level locking
    IF p_patient_id IS NOT NULL THEN
        EXECUTE format(
            'SELECT %I, %I FROM public.daily_tracking
             WHERE patient_id = $1 AND date = $2
             FOR UPDATE',
            v_sent_col, v_limit_col
        ) INTO v_sent, v_limit USING p_patient_id, p_date;
    ELSE
        EXECUTE format(
            'SELECT %I, %I FROM public.daily_tracking
             WHERE user_id IS NOT DISTINCT FROM $1 AND guest_session_id IS NOT DISTINCT FROM $2 AND date = $3
             FOR UPDATE',
            v_sent_col, v_limit_col
        ) INTO v_sent, v_limit USING p_user_id, p_guest_id, p_date;
    END IF;

    IF v_sent IS NULL THEN RETURN -1; END IF;
    IF v_sent >= v_limit THEN RETURN -1; END IF;

    v_new_sent := v_sent + 1;

    IF p_patient_id IS NOT NULL THEN
        EXECUTE format(
            'UPDATE public.daily_tracking SET %I = $1 WHERE patient_id = $2 AND date = $3',
            v_sent_col
        ) USING v_new_sent, p_patient_id, p_date;
    ELSE
        EXECUTE format(
            'UPDATE public.daily_tracking SET %I = $1 WHERE user_id IS NOT DISTINCT FROM $2 AND guest_session_id IS NOT DISTINCT FROM $3 AND date = $4',
            v_sent_col
        ) USING v_new_sent, p_user_id, p_guest_id, p_date;
    END IF;

    RETURN v_new_sent;
END;
$$;

-- 6. ATOMIC helper: mark task success as sent (Profile-Aware)
CREATE OR REPLACE FUNCTION public.mark_task_success_sent(
    p_patient_id UUID,
    p_date       DATE,
    p_task       TEXT,
    p_user_id    UUID DEFAULT NULL,
    p_guest_id   TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_col TEXT;
BEGIN
    IF p_task NOT IN ('diet', 'exercise', 'sleep', 'water', 'mental') THEN
        RAISE EXCEPTION 'Invalid task: %', p_task;
    END IF;

    v_col := p_task || '_success_sent';

    IF p_patient_id IS NOT NULL THEN
        EXECUTE format(
            'UPDATE public.daily_tracking SET %I = TRUE WHERE patient_id = $1 AND date = $2 AND %I = FALSE',
            v_col, v_col
        ) USING p_patient_id, p_date;
    ELSE
        EXECUTE format(
            'UPDATE public.daily_tracking SET %I = TRUE WHERE user_id IS NOT DISTINCT FROM $1 AND guest_session_id IS NOT DISTINCT FROM $2 AND date = $3 AND %I = FALSE',
            v_col, v_col
        ) USING p_user_id, p_guest_id, p_date;
    END IF;

    RETURN FOUND;
END;
$$;

-- 7. Add patient_id to user_reminder_settings
ALTER TABLE public.user_reminder_settings ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);

-- Backfill reminder settings
UPDATE public.user_reminder_settings r
SET patient_id = (SELECT id FROM public.patient_details p WHERE (p.user_id = r.user_id OR p.guest_session_id = r.guest_session_id) LIMIT 1)
WHERE r.patient_id IS NULL;

-- Update Unique Constraint for reminder settings
ALTER TABLE public.user_reminder_settings DROP CONSTRAINT IF EXISTS uq_reminder_user_section;
ALTER TABLE public.user_reminder_settings ADD CONSTRAINT uq_reminder_patient_section 
    UNIQUE NULLS NOT DISTINCT (patient_id, section);

-- 8. Index for performance
CREATE INDEX IF NOT EXISTS idx_daily_tracking_patient_id ON public.daily_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_patient ON public.user_reminder_settings(patient_id);

-- 9. Refresh Schema for PostgREST
NOTIFY pgrst, 'reload schema';

-- 11. Add patient_id to user_daily_tracking
ALTER TABLE public.user_daily_tracking ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);

-- Backfill user_daily_tracking
UPDATE public.user_daily_tracking u
SET patient_id = (SELECT id FROM public.patient_details p WHERE (p.user_id = u.user_id OR p.guest_session_id = u.guest_session_id) LIMIT 1)
WHERE u.patient_id IS NULL;

-- Update Unique Constraint for user_daily_tracking
ALTER TABLE public.user_daily_tracking DROP CONSTRAINT IF EXISTS uq_user_daily_tracking_upsert_unique;
-- The check for existing index/constraint
DROP INDEX IF EXISTS idx_user_daily_tracking_upsert_unique;
ALTER TABLE public.user_daily_tracking ADD CONSTRAINT uq_user_daily_tracking_patient_date 
    UNIQUE NULLS NOT DISTINCT (patient_id, date);

-- 12. Index for performance
CREATE INDEX IF NOT EXISTS idx_user_daily_tracking_patient_id ON public.user_daily_tracking(patient_id);
