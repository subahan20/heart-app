-- ==========================================
-- 084_finalize_profile_schema.sql
-- Final alignment of database with Profile-Based Architecture
-- Renames legacy 'patient_id' to 'profile_id' and 'patient_streak' to 'user_streaks'
-- ==========================================

DO $$ 
DECLARE
    t TEXT;
BEGIN
    -- 1. Rename 'patient_streak' to 'user_streaks'
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_streak') THEN
        ALTER TABLE public.patient_streak RENAME TO user_streaks;
    END IF;

    -- 2. Rename 'patient_id' columns to 'profile_id' in all relevant tables
    FOREACH t IN ARRAY ARRAY['user_daily_tracking', 'user_reminder_settings', 'user_streaks', 'transformation_plans', 'feature_persistence', 'bp_readings', 'sugar_readings', 'daily_tracking', 'notifications']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Check if column 'patient_id' exists and 'profile_id' does NOT exist
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'patient_id') 
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'profile_id') THEN
                
                EXECUTE format('ALTER TABLE public.%I RENAME COLUMN patient_id TO profile_id', t);
            
            -- Special case for tables that might have both (like notifications from migration 083)
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'patient_id') 
                  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'profile_id') THEN
                
                -- Sync data if needed
                EXECUTE format('UPDATE public.%I SET profile_id = patient_id WHERE profile_id IS NULL', t);
                -- Drop the legacy column
                EXECUTE format('ALTER TABLE public.%I DROP COLUMN patient_id', t);
            END IF;
        END IF;
    END LOOP;

    -- 3. Add profile_id to tables that missed it (feature_persistence)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feature_persistence') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feature_persistence' AND column_name = 'profile_id') THEN
            ALTER TABLE public.feature_persistence ADD COLUMN profile_id UUID REFERENCES public.profiles(id);
            CREATE INDEX IF NOT EXISTS idx_feature_persistence_profile_id ON public.feature_persistence(profile_id);
            
            -- Backfill from user_id if possible
            UPDATE public.feature_persistence f
            SET profile_id = (SELECT id FROM public.profiles p WHERE p.user_id = f.user_id OR p.guest_session_id = f.guest_session_id LIMIT 1)
            WHERE f.profile_id IS NULL;
        END IF;
    END IF;

END $$;

-- 4. Rewrite RPC Functions for consistency
CREATE OR REPLACE FUNCTION public.increment_task_reminder(
    p_profile_id UUID,
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
    IF p_profile_id IS NOT NULL THEN
        EXECUTE format(
            'SELECT %I, %I FROM public.user_daily_tracking
             WHERE profile_id = $1 AND date = $2
             FOR UPDATE',
            v_sent_col, v_limit_col
        ) INTO v_sent, v_limit USING p_profile_id, p_date;
    ELSE
        EXECUTE format(
            'SELECT %I, %I FROM public.user_daily_tracking
             WHERE user_id IS NOT DISTINCT FROM $1 AND guest_session_id IS NOT DISTINCT FROM $2 AND date = $3
             FOR UPDATE',
            v_sent_col, v_limit_col
        ) INTO v_sent, v_limit USING p_user_id, p_guest_id, p_date;
    END IF;

    IF v_sent IS NULL THEN RETURN -1; END IF;
    IF v_sent >= v_limit THEN RETURN -1; END IF;

    v_new_sent := v_sent + 1;

    IF p_profile_id IS NOT NULL THEN
        EXECUTE format(
            'UPDATE public.user_daily_tracking SET %I = $1 WHERE profile_id = $2 AND date = $3',
            v_sent_col
        ) USING v_new_sent, p_profile_id, p_date;
    ELSE
        EXECUTE format(
            'UPDATE public.user_daily_tracking SET %I = $1 WHERE user_id IS NOT DISTINCT FROM $2 AND guest_session_id IS NOT DISTINCT FROM $3 AND date = $4',
            v_sent_col
        ) USING v_new_sent, p_user_id, p_guest_id, p_date;
    END IF;

    -- Also update legacy daily_tracking if it exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_tracking') THEN
         IF p_profile_id IS NOT NULL THEN
            EXECUTE format('UPDATE public.daily_tracking SET %I = $1 WHERE profile_id = $2 AND date = $3', v_sent_col) USING v_new_sent, p_profile_id, p_date;
        END IF;
    END IF;

    RETURN v_new_sent;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_task_success_sent(
    p_profile_id UUID,
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

    IF p_profile_id IS NOT NULL THEN
        EXECUTE format(
            'UPDATE public.user_daily_tracking SET %I = TRUE WHERE profile_id = $1 AND date = $2 AND %I = FALSE',
            v_col, v_col
        ) USING p_profile_id, p_date;
    ELSE
        EXECUTE format(
            'UPDATE public.user_daily_tracking SET %I = TRUE WHERE user_id IS NOT DISTINCT FROM $1 AND guest_session_id IS NOT DISTINCT FROM $3 AND date = $4 AND %I = FALSE',
            v_col, v_col
        ) USING p_user_id, p_guest_id, p_date;
    END IF;
    
    -- Also update legacy daily_tracking if it exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_tracking') THEN
         IF p_profile_id IS NOT NULL THEN
            EXECUTE format('UPDATE public.daily_tracking SET %I = TRUE WHERE profile_id = $1 AND date = $2', v_col) USING p_profile_id, p_date;
        END IF;
    END IF;

    RETURN FOUND;
END;
$$;

NOTIFY pgrst, 'reload schema';
