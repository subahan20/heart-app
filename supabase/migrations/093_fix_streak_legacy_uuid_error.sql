-- ==========================================
-- 093_fix_streak_legacy_uuid_error.sql
-- Remove legacy patient_streak inserts that cause uuid cast errors
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
    v_profile_record RECORD;
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

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        SELECT * INTO v_profile_record 
        FROM public.profiles 
        WHERE (user_id IS NOT DISTINCT FROM v_user_id) 
           OR (guest_session_id IS NOT DISTINCT FROM v_guest_id)
        LIMIT 1;
    END IF;

    -- 3. Atomic Streak logic using user_streaks (new)
    IF v_is_fully_completed THEN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') 
           AND v_profile_record.id IS NOT NULL THEN
            INSERT INTO public.user_streaks (profile_id, streak_count, daily_completed, last_completed_date)
            VALUES (v_profile_record.id, 1, TRUE, v_date)
            ON CONFLICT (profile_id) DO UPDATE SET 
                streak_count = CASE 
                    WHEN user_streaks.last_completed_date = v_date THEN user_streaks.streak_count
                    WHEN user_streaks.last_completed_date = (v_date - 1) THEN user_streaks.streak_count + 1
                    ELSE 1
                END,
                daily_completed = TRUE, 
                last_completed_date = v_date, 
                updated_at = NOW()
            WHERE user_streaks.last_completed_date <= v_date;
        END IF;
    ELSE
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') 
           AND v_profile_record.id IS NOT NULL THEN
            UPDATE public.user_streaks 
            SET daily_completed = FALSE 
            WHERE profile_id = v_profile_record.id AND last_completed_date = v_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
