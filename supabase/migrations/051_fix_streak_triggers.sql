-- ==========================================
-- 051_fix_streak_triggers.sql
-- Fix "v_profile has no field last_streak_date"
-- Ensures we only query existing columns from patient_details
-- ==========================================

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

    -- 2. Get patient_details.id (ONLY get the ID, no dropped streak columns)
    SELECT id INTO v_patient_id FROM public.patient_details
    WHERE (user_id IS NOT DISTINCT FROM v_user_id) AND (guest_session_id IS NOT DISTINCT FROM v_guest_id);

    IF v_patient_id IS NULL THEN RETURN NEW; END IF;

    -- 3. Atomic Streak logic using public.patient_streak
    IF v_is_fully_completed THEN
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
