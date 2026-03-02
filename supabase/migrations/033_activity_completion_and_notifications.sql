-- ==========================================
-- 033_activity_completion_and_notifications.sql
-- Task Completion Tracking & Notification System (Auto-Set Logic)
-- ==========================================

-- 1. Add Completion Columns to existing tables
ALTER TABLE public.diet_plan ADD COLUMN IF NOT EXISTS is_breakfast_done BOOLEAN DEFAULT FALSE;
ALTER TABLE public.diet_plan ADD COLUMN IF NOT EXISTS is_lunch_done BOOLEAN DEFAULT FALSE;
ALTER TABLE public.diet_plan ADD COLUMN IF NOT EXISTS is_snacks_done BOOLEAN DEFAULT FALSE;
ALTER TABLE public.diet_plan ADD COLUMN IF NOT EXISTS is_dinner_done BOOLEAN DEFAULT FALSE;

ALTER TABLE public.activity_sessions ADD COLUMN IF NOT EXISTS is_exercise_done BOOLEAN DEFAULT FALSE;

ALTER TABLE public.daily_sleep ADD COLUMN IF NOT EXISTS is_sleep_done BOOLEAN DEFAULT FALSE;

ALTER TABLE public.daily_stress ADD COLUMN IF NOT EXISTS is_mental_stress_done BOOLEAN DEFAULT FALSE;

ALTER TABLE public.daily_water ADD COLUMN IF NOT EXISTS is_water_done BOOLEAN DEFAULT FALSE;

-- 2. Function to automatically set completion flags based on data
CREATE OR REPLACE FUNCTION public.auto_set_activity_completion_flags()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'diet_plan' THEN
        -- Mark true if any item exists in the specific meal array
        NEW.is_breakfast_done := COALESCE(jsonb_array_length(NEW.meals->'breakfast') > 0, FALSE);
        NEW.is_lunch_done := COALESCE(jsonb_array_length(NEW.meals->'lunch') > 0, FALSE);
        NEW.is_snacks_done := COALESCE(jsonb_array_length(NEW.meals->'snacks') > 0, FALSE);
        NEW.is_dinner_done := COALESCE(jsonb_array_length(NEW.meals->'dinner') > 0, FALSE);
    
    ELSIF TG_TABLE_NAME = 'activity_sessions' THEN
        -- Sync is_exercise_done with the existing 'completed' boolean
        IF NEW.completed = TRUE THEN
            NEW.is_exercise_done := TRUE;
        END IF;
    
    ELSIF TG_TABLE_NAME = 'daily_sleep' THEN
        -- Mark true if duration is logged
        IF NEW.duration_hours > 0 OR NEW.sleep_time IS NOT NULL THEN
            NEW.is_sleep_done := TRUE;
        END IF;

    ELSIF TG_TABLE_NAME = 'daily_stress' THEN
        -- Mark true if stress level is logged
        IF NEW.stress_level IS NOT NULL THEN
            NEW.is_mental_stress_done := TRUE;
        END IF;

    ELSIF TG_TABLE_NAME = 'daily_water' THEN
        -- Mark true if water glasses are logged
        IF NEW.glasses > 0 THEN
            NEW.is_water_done := TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Notification & Success Logic Function
CREATE OR REPLACE FUNCTION public.handle_activity_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_all_done BOOLEAN;
    v_user_id UUID := NEW.user_id;
    v_guest_id TEXT := NEW.guest_session_id;
    v_date DATE;
    v_activity_name TEXT;
BEGIN
    -- Safe Date Detection: Use table-specific column names
    IF TG_TABLE_NAME = 'activity_sessions' THEN
        v_date := date(NEW.start_time);
    ELSE
        v_date := NEW.date;
    END IF;

    -- 1. Category-Specific Success Notifications
    IF TG_TABLE_NAME = 'diet_plan' THEN
        IF (NEW.is_breakfast_done OR NEW.is_lunch_done OR NEW.is_snacks_done OR NEW.is_dinner_done) THEN
            v_activity_name := 'Diet';
        END IF;
    ELSIF TG_TABLE_NAME = 'activity_sessions' THEN
        IF NEW.is_exercise_done THEN
            v_activity_name := 'Exercise';
        END IF;
    ELSIF TG_TABLE_NAME = 'daily_sleep' THEN
        IF NEW.is_sleep_done THEN
            v_activity_name := 'Sleep';
        END IF;
    ELSIF TG_TABLE_NAME = 'daily_stress' THEN
        IF NEW.is_mental_stress_done THEN
            v_activity_name := 'Mental Stress';
        END IF;
    ELSIF TG_TABLE_NAME = 'daily_water' THEN
        IF NEW.is_water_done THEN
            v_activity_name := 'Water';
        END IF;
    END IF;

    IF v_activity_name IS NOT NULL THEN
        -- Safely check for duplicates bypassed by ON CONFLICT if NULLs are present
        -- Combining IF NOT EXISTS with ON CONFLICT DO NOTHING for absolute robustness
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id IS NOT DISTINCT FROM v_user_id 
              AND guest_session_id IS NOT DISTINCT FROM v_guest_id 
              AND date = v_date 
              AND category = v_activity_name 
              AND type = 'success'
        ) THEN
            INSERT INTO public.notifications (user_id, guest_session_id, category, type, title, message, date)
            VALUES (
                v_user_id, 
                v_guest_id, 
                v_activity_name, 
                'success', 
                'Daily Goal', 
                '✅ Great job! You completed your ' || v_activity_name || ' goal for today!', 
                v_date
            )
            ON CONFLICT (user_id, guest_session_id, date, category, type) DO NOTHING;
        END IF;
    END IF;

    -- 2. Check Global Completion
    SELECT (
        EXISTS (SELECT 1 FROM public.diet_plan WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id) AND date = v_date AND (is_breakfast_done OR is_lunch_done OR is_snacks_done OR is_dinner_done)) AND
        EXISTS (SELECT 1 FROM public.activity_sessions WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id) AND (date(start_time) = v_date) AND is_exercise_done) AND
        EXISTS (SELECT 1 FROM public.daily_sleep WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id) AND date = v_date AND is_sleep_done) AND
        EXISTS (SELECT 1 FROM public.daily_stress WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id) AND date = v_date AND is_mental_stress_done) AND
        EXISTS (SELECT 1 FROM public.daily_water WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id) AND date = v_date AND is_water_done)
    ) INTO v_all_done;

    IF v_all_done THEN
        -- 2.1 Send global success notification
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id IS NOT DISTINCT FROM v_user_id 
              AND guest_session_id IS NOT DISTINCT FROM v_guest_id 
              AND date = v_date 
              AND category = 'All Activities' 
              AND type = 'success'
        ) THEN
            INSERT INTO public.notifications (user_id, guest_session_id, category, type, title, message, date)
            VALUES (
                v_user_id, 
                v_guest_id, 
                'All Activities', 
                'success', 
                'Daily Achievement', 
                '🎉 Amazing! You completed all your health activities today!', 
                v_date
            )
            ON CONFLICT (user_id, guest_session_id, date, category, type) DO NOTHING;
        END IF;

        -- 2.2 Update Streak Count in patient_details
        UPDATE public.patient_details
        SET 
            streak_count = CASE 
                WHEN last_streak_date IS NULL THEN 1
                WHEN last_streak_date < v_date - INTERVAL '1 day' THEN 1
                WHEN last_streak_date = v_date - INTERVAL '1 day' THEN streak_count + 1
                ELSE streak_count -- Already updated for today or future
            END,
            last_streak_date = v_date,
            updated_at = NOW()
        WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id)
          AND (last_streak_date IS NULL OR last_streak_date < v_date);
          
        -- 2.3 Record daily streak snapshot
        INSERT INTO public.daily_streaks (user_id, guest_session_id, date, streak_count)
        VALUES (v_user_id, v_guest_id, v_date, (SELECT streak_count FROM public.patient_details WHERE (user_id IS NOT DISTINCT FROM v_user_id AND guest_session_id IS NOT DISTINCT FROM v_guest_id)))
        ON CONFLICT (user_id, guest_session_id, date) DO UPDATE 
        SET streak_count = EXCLUDED.streak_count, created_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers (BEFORE to set flags, AFTER to notify)
-- Apply Auto-Set to all relevant tables
DROP TRIGGER IF EXISTS trg_diet_auto_set ON public.diet_plan;
CREATE TRIGGER trg_diet_auto_set BEFORE INSERT OR UPDATE ON public.diet_plan FOR EACH ROW EXECUTE FUNCTION auto_set_activity_completion_flags();

DROP TRIGGER IF EXISTS trg_exercise_auto_set ON public.activity_sessions;
CREATE TRIGGER trg_exercise_auto_set BEFORE INSERT OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION auto_set_activity_completion_flags();

DROP TRIGGER IF EXISTS trg_sleep_auto_set ON public.daily_sleep;
CREATE TRIGGER trg_sleep_auto_set BEFORE INSERT OR UPDATE ON public.daily_sleep FOR EACH ROW EXECUTE FUNCTION auto_set_activity_completion_flags();

DROP TRIGGER IF EXISTS trg_stress_auto_set ON public.daily_stress;
CREATE TRIGGER trg_stress_auto_set BEFORE INSERT OR UPDATE ON public.daily_stress FOR EACH ROW EXECUTE FUNCTION auto_set_activity_completion_flags();

DROP TRIGGER IF EXISTS trg_water_auto_set ON public.daily_water;
CREATE TRIGGER trg_water_auto_set BEFORE INSERT OR UPDATE ON public.daily_water FOR EACH ROW EXECUTE FUNCTION auto_set_activity_completion_flags();

-- Apply Notifications
DROP TRIGGER IF EXISTS trg_diet_notify ON public.diet_plan;
CREATE TRIGGER trg_diet_notify AFTER INSERT OR UPDATE ON public.diet_plan FOR EACH ROW EXECUTE FUNCTION handle_activity_notifications();

DROP TRIGGER IF EXISTS trg_exercise_notify ON public.activity_sessions;
CREATE TRIGGER trg_exercise_notify AFTER INSERT OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION handle_activity_notifications();

DROP TRIGGER IF EXISTS trg_sleep_notify ON public.daily_sleep;
CREATE TRIGGER trg_sleep_notify AFTER INSERT OR UPDATE ON public.daily_sleep FOR EACH ROW EXECUTE FUNCTION handle_activity_notifications();

DROP TRIGGER IF EXISTS trg_stress_notify ON public.daily_stress;
CREATE TRIGGER trg_stress_notify AFTER INSERT OR UPDATE ON public.daily_stress FOR EACH ROW EXECUTE FUNCTION handle_activity_notifications();

DROP TRIGGER IF EXISTS trg_water_notify ON public.daily_water;
CREATE TRIGGER trg_water_notify AFTER INSERT OR UPDATE ON public.daily_water FOR EACH ROW EXECUTE FUNCTION handle_activity_notifications();
