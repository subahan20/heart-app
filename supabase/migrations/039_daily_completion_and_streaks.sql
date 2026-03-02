-- ==========================================
-- 039_daily_completion_and_streaks.sql
-- CLEANUP & OPTIMIZED STREAK LOGIC
-- ==========================================

-- 1. CLEANUP (Remove redundant columns from previous failed attempt)
DO $$ 
BEGIN
    -- Remove redundant columns if they were created
    ALTER TABLE public.diet_plan 
    DROP COLUMN IF EXISTS breakfast_completed,
    DROP COLUMN IF EXISTS lunch_completed,
    DROP COLUMN IF EXISTS dinner_completed,
    DROP COLUMN IF EXISTS snacks_completed;

    ALTER TABLE public.daily_sleep DROP COLUMN IF EXISTS is_sleep_completed;
    ALTER TABLE public.daily_water DROP COLUMN IF EXISTS is_water_completed;
    ALTER TABLE public.daily_stress DROP COLUMN IF EXISTS is_stress_completed;
EXCEPTION WHEN OTHERS THEN 
    -- Ignore errors if columns don't exist
END $$;

-- 2. ENSURE CENTRAL COLUMNS EXIST
ALTER TABLE public.patient_details 
ADD COLUMN IF NOT EXISTS daily_completed BOOLEAN DEFAULT FALSE;
-- streak_count and last_streak_date already exist in patient_details

-- 3. OPTIMIZED COMPLETION CALCULATION
-- Uses is_..._done columns from 033 migration
CREATE OR REPLACE FUNCTION public.calculate_daily_completion(
    p_user_id UUID,
    p_guest_session_id TEXT,
    p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_diet_done BOOLEAN := FALSE;
    v_exercise_done BOOLEAN := FALSE;
    v_sleep_done BOOLEAN := FALSE;
    v_water_done BOOLEAN := FALSE;
    v_stress_done BOOLEAN := FALSE;
BEGIN
    -- Check Diet (ALL 4 meals must be TRUE)
    SELECT (is_breakfast_done AND is_lunch_done AND is_snacks_done AND is_dinner_done)
    INTO v_diet_done
    FROM public.diet_plan
    WHERE (user_id IS NOT DISTINCT FROM p_user_id)
      AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id)
      AND date = p_date;

    -- Check Exercise (activity_sessions)
    SELECT EXISTS (
        SELECT 1 FROM public.activity_sessions
        WHERE (user_id IS NOT DISTINCT FROM p_user_id)
          AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id)
          AND DATE(start_time) = p_date
          AND is_exercise_done = TRUE
    ) INTO v_exercise_done;

    -- Check Sleep
    SELECT is_sleep_done INTO v_sleep_done
    FROM public.daily_sleep
    WHERE (user_id IS NOT DISTINCT FROM p_user_id)
      AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id)
      AND date = p_date;

    -- Check Water
    SELECT is_water_done INTO v_water_done
    FROM public.daily_water
    WHERE (user_id IS NOT DISTINCT FROM p_user_id)
      AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id)
      AND date = p_date;

    -- Check Stress
    SELECT is_mental_stress_done INTO v_stress_done
    FROM public.daily_stress
    WHERE (user_id IS NOT DISTINCT FROM p_user_id)
      AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id)
      AND date = p_date;

    -- Return TRUE ONLY if all 5 markers are TRUE for today
    RETURN (COALESCE(v_diet_done, FALSE) 
            AND COALESCE(v_exercise_done, FALSE) 
            AND COALESCE(v_sleep_done, FALSE) 
            AND COALESCE(v_water_done, FALSE) 
            AND COALESCE(v_stress_done, FALSE));
END;
$$;

-- 4. STREAK UPDATER (Optimized & Atomic)
CREATE OR REPLACE FUNCTION public.update_daily_completion_and_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_guest_id TEXT;
    v_date DATE;
    v_is_fully_completed BOOLEAN;
    v_profile RECORD;
    v_yesterday DATE := CURRENT_DATE - 1;
BEGIN
    -- Context detection
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    v_guest_id := COALESCE(NEW.guest_session_id, OLD.guest_session_id);
    
    IF TG_TABLE_NAME = 'activity_sessions' THEN
        v_date := DATE(COALESCE(NEW.start_time, OLD.start_time));
    ELSE
        v_date := COALESCE(NEW.date, OLD.date);
    END IF;

    -- Only process today's completion
    IF v_date != CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    -- Run the multi-table check
    v_is_fully_completed := calculate_daily_completion(v_user_id, v_guest_id, v_date);

    -- Get central profile
    SELECT id, streak_count, last_streak_date, daily_completed INTO v_profile 
    FROM public.patient_details
    WHERE (user_id IS NOT DISTINCT FROM v_user_id)
      AND (guest_session_id IS NOT DISTINCT FROM v_guest_id);

    IF v_profile.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF v_is_fully_completed THEN
        -- Only update once per day
        IF v_profile.last_streak_date IS NULL OR v_profile.last_streak_date < v_date THEN
            IF v_profile.last_streak_date = v_yesterday THEN
                UPDATE public.patient_details 
                SET streak_count = v_profile.streak_count + 1,
                    last_streak_date = v_date,
                    daily_completed = TRUE
                WHERE id = v_profile.id;
            ELSE
                UPDATE public.patient_details 
                SET streak_count = 1,
                    last_streak_date = v_date,
                    daily_completed = TRUE
                WHERE id = v_profile.id;
            END IF;
        END IF;
    ELSE
        -- If user un-completes something today
        IF v_profile.daily_completed THEN
            UPDATE public.patient_details SET daily_completed = FALSE WHERE id = v_profile.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. APPLY TRIGGERS
-- We use AFTER triggers to ensure all table-specific logic has run
DO $$
DECLARE
    v_tables TEXT[] := ARRAY['diet_plan', 'activity_sessions', 'daily_sleep', 'daily_water', 'daily_stress'];
    v_t TEXT;
BEGIN
    FOREACH v_t IN ARRAY v_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_streak_sync_%I ON public.%I', v_t, v_t);
        EXECUTE format('CREATE TRIGGER trg_streak_sync_%I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_daily_completion_and_streak()', v_t, v_t);
    END LOOP;
END $$;
