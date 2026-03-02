-- ==========================================
-- 054_daily_tracking_table.sql
-- Unified Daily Tracking Table
-- Records per-section completion status per user per day.
-- ==========================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.daily_tracking (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id    TEXT,
    date                DATE NOT NULL DEFAULT CURRENT_DATE,
    diet_completed      BOOLEAN NOT NULL DEFAULT FALSE,
    exercise_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    sleep_completed     BOOLEAN NOT NULL DEFAULT FALSE,
    water_completed     BOOLEAN NOT NULL DEFAULT FALSE,
    mental_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    all_completed       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Each user/guest can only have one row per day
    CONSTRAINT daily_tracking_user_date_unique
        UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, date)
);

-- 2. UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS update_daily_tracking_updated_at ON public.daily_tracking;
CREATE TRIGGER update_daily_tracking_updated_at
    BEFORE UPDATE ON public.daily_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date
    ON public.daily_tracking(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_guest_date
    ON public.daily_tracking(guest_session_id, date DESC);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.daily_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily_tracking" ON public.daily_tracking;
CREATE POLICY "Users can manage own daily_tracking"
    ON public.daily_tracking FOR ALL
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR
        (guest_session_id IS NOT NULL AND user_id IS NULL)
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR
        (guest_session_id IS NOT NULL AND user_id IS NULL)
    );

-- 5. TRIGGER FUNCTION: Check all_completed & fire streak increment
-- This runs after any UPDATE on daily_tracking columns.
CREATE OR REPLACE FUNCTION public.check_and_set_all_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_patient_id INTEGER;
BEGIN
    -- Only evaluate if at least one completion column changed
    IF (NEW.diet_completed IS DISTINCT FROM OLD.diet_completed
        OR NEW.exercise_completed IS DISTINCT FROM OLD.exercise_completed
        OR NEW.sleep_completed IS DISTINCT FROM OLD.sleep_completed
        OR NEW.water_completed IS DISTINCT FROM OLD.water_completed
        OR NEW.mental_completed IS DISTINCT FROM OLD.mental_completed) THEN

        -- Check if all 5 sections are now TRUE
        IF NEW.diet_completed AND NEW.exercise_completed AND NEW.sleep_completed
           AND NEW.water_completed AND NEW.mental_completed THEN

            NEW.all_completed := TRUE;

            -- Increment cumulative streak (only if not already done today)
            SELECT pd.id INTO v_patient_id
            FROM public.patient_details pd
            WHERE (pd.user_id IS NOT DISTINCT FROM NEW.user_id)
              AND (pd.guest_session_id IS NOT DISTINCT FROM NEW.guest_session_id);

            IF v_patient_id IS NOT NULL THEN
                PERFORM public.increment_cumulative_streak(v_patient_id, NEW.date);
            END IF;

        ELSE
            NEW.all_completed := FALSE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach the trigger (BEFORE UPDATE so we can set NEW.all_completed)
DROP TRIGGER IF EXISTS trg_daily_tracking_check_completion ON public.daily_tracking;
CREATE TRIGGER trg_daily_tracking_check_completion
    BEFORE INSERT OR UPDATE ON public.daily_tracking
    FOR EACH ROW EXECUTE FUNCTION check_and_set_all_completed();

-- 6. POPULATE FUNCTION — called by cron at 12:01 AM each day
-- Inserts a fresh row for EVERY registered user for CURRENT_DATE
-- (skips users that already have a row for today)
CREATE OR REPLACE FUNCTION public.populate_daily_tracking()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.daily_tracking (user_id, guest_session_id, date)
    SELECT pd.user_id, pd.guest_session_id, CURRENT_DATE
    FROM public.patient_details pd
    WHERE pd.user_id IS NOT NULL   -- Only seed for authenticated users (guests are transient)
    ON CONFLICT (user_id, guest_session_id, date) DO NOTHING;
END;
$$;

-- 7. GRANT EXECUTE to service role (used by cron/edge function)
GRANT EXECUTE ON FUNCTION public.populate_daily_tracking() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_set_all_completed() TO service_role;
