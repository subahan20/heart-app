-- ============================================================
-- 058_smart_notifications_schema.sql
-- Smart per-task notification tracking columns
-- ============================================================

-- 1. ADD per-task reminder counters to daily_tracking
ALTER TABLE public.daily_tracking
    ADD COLUMN IF NOT EXISTS diet_reminders_sent      INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exercise_reminders_sent  INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sleep_reminders_sent     INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS water_reminders_sent     INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mental_reminders_sent    INT NOT NULL DEFAULT 0;

-- 2. ADD per-task success-sent flags
ALTER TABLE public.daily_tracking
    ADD COLUMN IF NOT EXISTS diet_success_sent      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS exercise_success_sent  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sleep_success_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS water_success_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mental_success_sent    BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. ADD per-task daily reminder limits (random 5–10, set at midnight)
ALTER TABLE public.daily_tracking
    ADD COLUMN IF NOT EXISTS diet_reminder_limit      INT NOT NULL DEFAULT 7,
    ADD COLUMN IF NOT EXISTS exercise_reminder_limit  INT NOT NULL DEFAULT 7,
    ADD COLUMN IF NOT EXISTS sleep_reminder_limit     INT NOT NULL DEFAULT 7,
    ADD COLUMN IF NOT EXISTS water_reminder_limit     INT NOT NULL DEFAULT 7,
    ADD COLUMN IF NOT EXISTS mental_reminder_limit    INT NOT NULL DEFAULT 7;

-- ============================================================
-- 4. UPDATE populate_daily_tracking() to set random limits
--    (5–10 inclusive: floor(random()*6)+5)
-- ============================================================
CREATE OR REPLACE FUNCTION public.populate_daily_tracking()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.daily_tracking (
        user_id,
        guest_session_id,
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
        CURRENT_DATE,
        floor(random() * 6 + 5)::INT,   -- 5–10
        floor(random() * 6 + 5)::INT,
        floor(random() * 6 + 5)::INT,
        floor(random() * 6 + 5)::INT,
        floor(random() * 6 + 5)::INT
    FROM public.patient_details pd
    WHERE pd.user_id IS NOT NULL
    ON CONFLICT (user_id, guest_session_id, date) DO NOTHING;
END;
$$;

-- ============================================================
-- 5. ATOMIC helper: increment a task's reminder counter
--    Returns the NEW count, or -1 if already at/over limit.
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_task_reminder(
    p_user_id   UUID,
    p_date      DATE,
    p_task      TEXT   -- 'diet' | 'exercise' | 'sleep' | 'water' | 'mental'
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sent_col  TEXT;
    v_limit_col TEXT;
    v_sent      INT;
    v_limit     INT;
    v_new_sent  INT;
BEGIN
    -- Validate task name to prevent SQL injection
    IF p_task NOT IN ('diet', 'exercise', 'sleep', 'water', 'mental') THEN
        RAISE EXCEPTION 'Invalid task: %', p_task;
    END IF;

    v_sent_col  := p_task || '_reminders_sent';
    v_limit_col := p_task || '_reminder_limit';

    -- Read current values
    EXECUTE format(
        'SELECT %I, %I FROM public.daily_tracking
         WHERE user_id = $1 AND date = $2
         FOR UPDATE',
        v_sent_col, v_limit_col
    ) INTO v_sent, v_limit USING p_user_id, p_date;

    IF v_sent IS NULL THEN
        RETURN -1; -- No row yet
    END IF;

    IF v_sent >= v_limit THEN
        RETURN -1; -- Cap reached
    END IF;

    v_new_sent := v_sent + 1;

    EXECUTE format(
        'UPDATE public.daily_tracking SET %I = $1
         WHERE user_id = $2 AND date = $3',
        v_sent_col
    ) USING v_new_sent, p_user_id, p_date;

    RETURN v_new_sent;
END;
$$;

-- ============================================================
-- 6. ATOMIC helper: mark task success as sent (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_task_success_sent(
    p_user_id UUID,
    p_date    DATE,
    p_task    TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_col TEXT;
BEGIN
    IF p_task NOT IN ('diet', 'exercise', 'sleep', 'water', 'mental') THEN
        RAISE EXCEPTION 'Invalid task: %', p_task;
    END IF;

    v_col := p_task || '_success_sent';

    EXECUTE format(
        'UPDATE public.daily_tracking
         SET %I = TRUE
         WHERE user_id = $1 AND date = $2 AND %I = FALSE',
        v_col, v_col
    ) USING p_user_id, p_date;

    -- Returns TRUE if a row was actually updated (i.e., was previously FALSE)
    RETURN FOUND;
END;
$$;

-- ============================================================
-- 7. GRANTS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.populate_daily_tracking()          TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_task_reminder(UUID, DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_task_success_sent(UUID, DATE, TEXT)  TO service_role;
