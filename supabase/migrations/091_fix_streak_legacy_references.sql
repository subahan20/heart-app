-- ==========================================
-- 091_fix_streak_legacy_references.sql
-- Fix legacy 'patient_streak' references in functions and triggers
-- ==========================================

-- 1. Redefine sync_daily_streak to use user_streaks and profile_id
CREATE OR REPLACE FUNCTION public.sync_daily_streak(p_date DATE, p_profile_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Ensure user_streaks exists for this profile
    INSERT INTO public.user_streaks (profile_id, streak_count, daily_completed, last_completed_date)
    SELECT p_profile_id, 0, FALSE, NULL
    WHERE p_profile_id IS NOT NULL
    ON CONFLICT (profile_id) DO NOTHING;

    -- Update the streak
    UPDATE public.user_streaks
    SET 
        streak_count = CASE 
            WHEN last_completed_date = p_date THEN streak_count -- Already done today
            WHEN last_completed_date = (p_date - 1) THEN streak_count + 1 -- Continued from yesterday
            ELSE 1 -- Reset or Start new
        END,
        daily_completed = TRUE,
        last_completed_date = p_date
    WHERE profile_id = p_profile_id
      AND (last_completed_date IS NULL OR last_completed_date < p_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update any triggers that call sync_daily_streak
-- Usually these are on daily_tracking or diet_plan

-- Redefine the trigger function for daily tracking
CREATE OR REPLACE FUNCTION public.handle_streak_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update streak if something meaningful was completed
    -- (You can add logic here to check if calories > 0 etc)
    PERFORM public.sync_daily_streak(NEW.date, NEW.profile_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Notify PostgREST
NOTIFY pgrst, 'reload schema';
