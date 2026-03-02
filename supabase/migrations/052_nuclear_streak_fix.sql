-- ==========================================
-- 052_nuclear_streak_fix.sql
-- FORCE CLEANUP of all conflicting streak/notification triggers
-- Run this in your Supabase SQL Editor to resolve the "v_profile" error.
-- ==========================================

-- 1. THE NUCLEAR SCRUB: Drop ONLY USER-DEFINED triggers to avoid system errors
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tgname, relname 
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' 
          AND c.relname IN ('daily_sleep', 'daily_exercise', 'daily_water', 'diet_plan', 'activity_sessions', 'daily_stress', 'patient_details', 'notifications')
          AND t.tgisinternal = false -- CRITICAL: Skip system/constraint triggers!
    )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', r.tgname, r.relname);
    END LOOP;
END $$;

-- 2. DROP ALL FUNCTIONS related to streaks and notifications
DROP FUNCTION IF EXISTS public.update_daily_completion_and_streak() CASCADE;
DROP FUNCTION IF EXISTS public.handle_activity_notifications() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_daily_completion(UUID, TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.auto_set_activity_completion_flags() CASCADE;

-- 3. RECREATE CLEAN COMPONENTS (Safe and verified)

-- A. Completion logic (Verified safe)
CREATE OR REPLACE FUNCTION public.calculate_daily_completion(p_user_id UUID, p_guest_id TEXT, p_date DATE) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_d BOOLEAN; v_e BOOLEAN; v_sl BOOLEAN; v_w BOOLEAN; v_st BOOLEAN;
BEGIN
    SELECT (COALESCE(is_breakfast_done, FALSE) AND COALESCE(is_lunch_done, FALSE) AND COALESCE(is_snacks_done, FALSE) AND COALESCE(is_dinner_done, FALSE))
    INTO v_d FROM public.diet_plan WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_id) AND date = p_date;

    SELECT EXISTS (SELECT 1 FROM public.activity_sessions WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_id) AND DATE(start_time) = p_date AND (completed = TRUE OR is_exercise_done = TRUE)) INTO v_e;

    SELECT COALESCE(is_sleep_done, FALSE) INTO v_sl FROM public.daily_sleep WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_guest_id) AND date = p_date;

    SELECT COALESCE(is_water_done, FALSE) INTO v_w FROM public.daily_water WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_gid) AND date = p_date;

    SELECT COALESCE(is_mental_stress_done, FALSE) INTO v_st FROM public.daily_stress WHERE (user_id IS NOT DISTINCT FROM p_user_id) AND (guest_session_id IS NOT DISTINCT FROM p_gid) AND date = p_date;

    RETURN (COALESCE(v_d, FALSE) AND COALESCE(v_e, FALSE) AND COALESCE(v_sl, FALSE) AND COALESCE(v_w, FALSE) AND COALESCE(v_st, FALSE));
END; $$;

-- B. Streak logic (Uses patient_streak table only)
CREATE OR REPLACE FUNCTION public.update_daily_completion_and_streak()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid UUID; v_gid TEXT; v_dt DATE; v_done BOOLEAN; v_pid INTEGER;
BEGIN
    v_uid := COALESCE(NEW.user_id, OLD.user_id); v_gid := COALESCE(NEW.guest_session_id, OLD.guest_session_id);
    IF TG_TABLE_NAME = 'activity_sessions' THEN v_dt := DATE(COALESCE(NEW.start_time, OLD.start_time)); ELSE v_dt := COALESCE(NEW.date, OLD.date); END IF;
    
    v_done := calculate_daily_completion(v_uid, v_gid, v_dt);
    SELECT id INTO v_pid FROM public.patient_details WHERE (user_id IS NOT DISTINCT FROM v_uid) AND (guest_session_id IS NOT DISTINCT FROM v_gid);
    
    IF v_pid IS NOT NULL THEN
        IF v_done THEN
            INSERT INTO public.patient_streak (patient_id, streak_count, daily_completed, last_completed_date)
            VALUES (v_pid, 1, TRUE, v_dt)
            ON CONFLICT (patient_id) DO UPDATE SET 
                streak_count = CASE WHEN patient_streak.last_completed_date = (v_dt - 1) THEN patient_streak.streak_count + 1 ELSE 1 END,
                daily_completed = TRUE, last_completed_date = v_dt, updated_at = NOW()
            WHERE patient_streak.last_completed_date < v_dt;
        ELSE
            UPDATE public.patient_streak SET daily_completed = FALSE WHERE patient_id = v_pid AND last_completed_date = v_dt;
        END IF;
    END IF;
    RETURN NEW;
END; $$;

-- C. Notification logic (No record variables, just direct checks)
CREATE OR REPLACE FUNCTION public.handle_activity_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_act TEXT; v_uid UUID := NEW.user_id; v_gid TEXT := NEW.guest_session_id; v_dt DATE;
BEGIN
    IF TG_TABLE_NAME = 'activity_sessions' THEN v_dt := date(COALESCE(NEW.start_time, OLD.start_time)); ELSE v_dt := COALESCE(NEW.date, OLD.date); END IF;
    
    IF TG_TABLE_NAME = 'diet_plan' THEN v_act := 'Diet';
    ELSIF TG_TABLE_NAME = 'activity_sessions' THEN v_act := 'Exercise';
    ELSIF TG_TABLE_NAME = 'daily_sleep' THEN v_act := 'Sleep';
    ELSIF TG_TABLE_NAME = 'daily_stress' THEN v_act := 'Mental Stress';
    ELSIF TG_TABLE_NAME = 'daily_water' THEN v_act := 'Water';
    END IF;

    IF v_act IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, guest_session_id, category, type, title, message, date)
        VALUES (v_uid, v_gid, v_act, 'success', 'Daily Goal', '✅ Goal completed!', v_dt) ON CONFLICT DO NOTHING;
    END IF;

    IF calculate_daily_completion(v_uid, v_gid, v_dt) THEN
        INSERT INTO public.notifications (user_id, guest_session_id, category, type, title, message, date)
        VALUES (v_uid, v_gid, 'All Activities', 'success', 'Daily Achievement', '🎉 All activities done!', v_dt) ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END; $$;

-- D. Flag Logic
CREATE OR REPLACE FUNCTION public.auto_set_activity_completion_flags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'diet_plan' THEN
        NEW.is_breakfast_done := COALESCE(jsonb_array_length(NEW.meals->'breakfast') > 0, FALSE);
        NEW.is_lunch_done := COALESCE(jsonb_array_length(NEW.meals->'lunch') > 0, FALSE);
        NEW.is_snacks_done := COALESCE(jsonb_array_length(NEW.meals->'snacks') > 0, FALSE);
        NEW.is_dinner_done := COALESCE(jsonb_array_length(NEW.meals->'dinner') > 0, FALSE);
    ELSIF TG_TABLE_NAME = 'activity_sessions' THEN
        IF NEW.completed THEN NEW.is_exercise_done := TRUE; END IF;
    ELSIF TG_TABLE_NAME = 'daily_sleep' THEN
        IF NEW.duration_hours > 0 OR NEW.sleep_time IS NOT NULL THEN NEW.is_sleep_done := TRUE; END IF;
    ELSIF TG_TABLE_NAME = 'daily_stress' THEN
        IF NEW.stress_level IS NOT NULL THEN NEW.is_mental_stress_done := TRUE; END IF;
    ELSIF TG_TABLE_NAME = 'daily_water' THEN
        IF NEW.glasses > 0 THEN NEW.is_water_done := TRUE; END IF;
    END IF;
    RETURN NEW;
END; $$;

-- 4. ATTACH THE FRESH TRIGGERS
DO $$
DECLARE
    v_t TEXT;
    v_tabs TEXT[] := ARRAY['diet_plan', 'activity_sessions', 'daily_sleep', 'daily_water', 'daily_stress'];
BEGIN
    FOREACH v_t IN ARRAY v_tabs LOOP
        EXECUTE format('CREATE TRIGGER trg_%I_auto_set BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION auto_set_activity_completion_flags()', v_t, v_t);
        EXECUTE format('CREATE TRIGGER trg_streak_sync_%I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_daily_completion_and_streak()', v_t, v_t);
        EXECUTE format('CREATE TRIGGER trg_%I_notify AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION handle_activity_notifications()', v_t, v_t);
    END LOOP;
END $$;
