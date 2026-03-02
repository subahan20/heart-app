-- ==========================================
-- 040_separate_streak_table.sql
-- Separate Streak Storage & Logic Refactor (FINAL ROBUST VERSION)
-- ==========================================

-- 1. DROP OLD STREAK COLUMNS FROM PATIENT_DETAILS
ALTER TABLE public.patient_details 
DROP COLUMN IF EXISTS streak_count,
DROP COLUMN IF EXISTS daily_completed,
DROP COLUMN IF EXISTS last_streak_date;

-- 2. CREATE NEW SEPARATE STREAK TABLE
CREATE TABLE IF NOT EXISTS public.patient_streak (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id INTEGER NOT NULL REFERENCES public.patient_details(id) ON DELETE CASCADE,
    streak_count INTEGER DEFAULT 0,
    daily_completed BOOLEAN DEFAULT FALSE,
    last_completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT patient_streak_patient_id_key UNIQUE (patient_id)
);

-- Updated at trigger for new table
DROP TRIGGER IF EXISTS update_patient_streak_updated_at ON public.patient_streak;
CREATE TRIGGER update_patient_streak_updated_at 
    BEFORE UPDATE ON public.patient_streak 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for patient_streak
ALTER TABLE public.patient_streak ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users and Guests can manage own streak" ON public.patient_streak;
CREATE POLICY "Users and Guests can manage own streak" 
    ON public.patient_streak FOR ALL 
    USING (
        patient_id IN (
            SELECT id FROM public.patient_details 
            WHERE (auth.uid() = user_id OR guest_session_id IS NOT NULL)
        )
    );

-- 3. UPDATED COMPLETION CALCULATION (ROBUST)
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
    v_diet_done BOOLEAN;
    v_exercise_done BOOLEAN;
    v_sleep_done BOOLEAN;
    v_water_done BOOLEAN;
    v_stress_done BOOLEAN;
BEGIN
    -- Check Diet (Using is_..._done columns from 033)
    SELECT (COALESCE(is_breakfast_done, FALSE) AND COALESCE(is_lunch_done, FALSE) AND COALESCE(is_snacks_done, FALSE) AND COALESCE(is_dinner_done, FALSE))
    INTO v_diet_done FROM public.diet_plan
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Check Exercise (Matches activity_sessions timer OR manual daily_exercise table)
    SELECT (EXISTS (
        SELECT 1 FROM public.activity_sessions
        WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) 
          AND DATE(start_time) = p_date 
          AND (completed = TRUE OR is_exercise_done = TRUE)
    ) OR EXISTS (
        SELECT 1 FROM public.daily_exercise
        WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id)
          AND date = p_date
    )) INTO v_exercise_done;

    -- Check Sleep
    SELECT COALESCE(is_sleep_done, FALSE) INTO v_sleep_done FROM public.daily_sleep
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Check Water
    SELECT COALESCE(is_water_done, FALSE) INTO v_water_done FROM public.daily_water
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Check Stress
    SELECT COALESCE(is_mental_stress_done, FALSE) INTO v_stress_done FROM public.daily_stress
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Return TRUE ONLY if all 5 markers are TRUE for today (Handled for NULLs)
    RETURN (COALESCE(v_diet_done, FALSE) AND v_exercise_done AND COALESCE(v_sleep_done, FALSE) AND COALESCE(v_water_done, FALSE) AND COALESCE(v_stress_done, FALSE));
END;
$$;

-- 4. ATOMIC STREAK UPSERT FUNCTION (FIXED)
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
    v_patient_id INTEGER;
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

    -- 1. Check if fully completed today
    v_is_fully_completed := calculate_daily_completion(v_user_id, v_guest_id, v_date);

    -- 2. Get patient_details.id
    SELECT id INTO v_patient_id FROM public.patient_details
    WHERE (user_id IS NOT DISTINCT FROM v_user_id) AND (guest_session_id IS NOT DISTINCT FROM v_guest_id);

    IF v_patient_id IS NULL THEN RETURN NEW; END IF;

    -- 3. Atomic Streak logic
    IF v_is_fully_completed THEN
        -- UPSERT with logic matching user requirements:
        -- If last_completed_date = CURRENT_DATE (or v_date) -> No change (Already incremented today)
        -- If last_completed_date = Yesterday -> streak_count + 1
        -- Else -> Reset to 1
        INSERT INTO public.patient_streak (patient_id, streak_count, daily_completed, last_completed_date)
        VALUES (v_patient_id, 1, TRUE, v_date)
        ON CONFLICT (patient_id) DO UPDATE SET 
            streak_count = CASE 
                WHEN patient_streak.last_completed_date = v_date THEN patient_streak.streak_count -- Already done today
                WHEN patient_streak.last_completed_date = (v_date - 1) THEN patient_streak.streak_count + 1 -- Continued from yesterday
                ELSE 1 -- New or broken streak
            END,
            daily_completed = TRUE, 
            last_completed_date = v_date, 
            updated_at = NOW()
        -- WHERE ensures we don't accidentally DOWNGRADE a streak if a past log is updated
        -- But ALLOWS updating daily_completed = TRUE if it was FALSE for today
        WHERE patient_streak.last_completed_date <= v_date;
    ELSE
        -- If un-completed today, only mark daily_completed = FALSE for current date
        UPDATE public.patient_streak 
        SET daily_completed = FALSE 
        WHERE patient_id = v_patient_id AND last_completed_date = v_date;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. RE-ATTACH TRIGGERS (AFTER trigger ensures AFTER completion flags are set)
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
