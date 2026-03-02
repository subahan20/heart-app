-- ==========================================
-- 050_remove_daily_exercise_refs.sql
-- Remove references to the missing daily_exercise table from triggers
-- so the app can use activity_sessions exclusively.
-- ==========================================

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
    -- Check Diet
    SELECT (COALESCE(is_breakfast_done, FALSE) AND COALESCE(is_lunch_done, FALSE) AND COALESCE(is_snacks_done, FALSE) AND COALESCE(is_dinner_done, FALSE))
    INTO v_diet_done FROM public.diet_plan
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Check Exercise (Matches activity_sessions timer ONLY to avoid missing table errors)
    SELECT EXISTS (
        SELECT 1 FROM public.activity_sessions
        WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) 
          AND DATE(start_time) = p_date 
          AND (completed = TRUE OR is_exercise_done = TRUE)
    ) INTO v_exercise_done;

    -- Check Sleep
    SELECT COALESCE(is_sleep_done, FALSE) INTO v_sleep_done FROM public.daily_sleep
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Check Water
    SELECT COALESCE(is_water_done, FALSE) INTO v_water_done FROM public.daily_water
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Check Stress
    SELECT COALESCE(is_mental_stress_done, FALSE) INTO v_stress_done FROM public.daily_stress
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_session_id) AND date = p_date;

    -- Return TRUE ONLY if all 5 markers are TRUE for today
    RETURN (COALESCE(v_diet_done, FALSE) AND COALESCE(v_exercise_done, FALSE) AND COALESCE(v_sleep_done, FALSE) AND COALESCE(v_water_done, FALSE) AND COALESCE(v_stress_done, FALSE));
END;
$$;
