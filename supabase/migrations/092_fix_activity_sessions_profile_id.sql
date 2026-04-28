-- ==========================================
-- 092_fix_activity_sessions_profile_id.sql
-- Fix: activity_sessions does NOT need profile_id.
-- The streak trigger must NOT reference NEW.profile_id on activity_sessions.
-- ==========================================

-- 1. Drop profile_id from activity_sessions if it exists (wrong type or not needed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'activity_sessions' AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE public.activity_sessions DROP COLUMN profile_id;
    END IF;
END $$;

-- 2. Also drop any foreign key constraint that may remain
ALTER TABLE public.activity_sessions 
    DROP CONSTRAINT IF EXISTS activity_sessions_profile_id_fkey;

-- 3. Recreate the streak trigger function WITHOUT referencing NEW.profile_id on activity_sessions
--    The function already works fine via user_id / guest_session_id lookups.
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
    v_profile_id UUID;
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

    -- 2. Get profile_id safely (works for both patient_details and profiles schemas)
    v_profile_id := NULL;
    
    -- Try profiles table first (new schema)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        SELECT id INTO v_profile_id 
        FROM public.profiles 
        WHERE (user_id IS NOT DISTINCT FROM v_user_id) 
           OR (guest_session_id IS NOT DISTINCT FROM v_guest_id)
        LIMIT 1;
    END IF;
    
    -- Fallback to patient_details if profiles didn't yield result
    IF v_profile_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_details') THEN
        SELECT id INTO v_patient_id 
        FROM public.patient_details 
        WHERE (user_id IS NOT DISTINCT FROM v_user_id) 
           AND (guest_session_id IS NOT DISTINCT FROM v_guest_id)
        LIMIT 1;
    END IF;

    -- 3. Atomic Streak logic using public.patient_streak (legacy) or user_streaks (new)
    IF v_is_fully_completed THEN
        -- Legacy streak table
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_streak') 
           AND v_patient_id IS NOT NULL THEN
            INSERT INTO public.patient_streak (patient_id, streak_count, daily_completed, last_completed_date)
            VALUES (v_patient_id, 1, TRUE, v_date)
            ON CONFLICT (patient_id) DO UPDATE SET 
                streak_count = CASE 
                    WHEN patient_streak.last_completed_date = v_date THEN patient_streak.streak_count
                    WHEN patient_streak.last_completed_date = (v_date - 1) THEN patient_streak.streak_count + 1
                    ELSE 1
                END,
                daily_completed = TRUE, 
                last_completed_date = v_date, 
                updated_at = NOW()
            WHERE patient_streak.last_completed_date <= v_date;
        END IF;
        
        -- New streak table
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') 
           AND v_profile_id IS NOT NULL THEN
            INSERT INTO public.user_streaks (profile_id, streak_count, daily_completed, last_completed_date)
            VALUES (v_profile_id, 1, TRUE, v_date)
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
        -- Mark uncompleted for legacy table
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_streak') 
           AND v_patient_id IS NOT NULL THEN
            UPDATE public.patient_streak 
            SET daily_completed = FALSE 
            WHERE patient_id = v_patient_id AND last_completed_date = v_date;
        END IF;
        
        -- Mark uncompleted for new table
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') 
           AND v_profile_id IS NOT NULL THEN
            UPDATE public.user_streaks 
            SET daily_completed = FALSE 
            WHERE profile_id = v_profile_id AND last_completed_date = v_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
