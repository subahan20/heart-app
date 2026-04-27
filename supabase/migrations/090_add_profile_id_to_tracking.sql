-- ==========================================
-- 090_add_profile_id_to_tracking.sql
-- Add profile_id column to all daily tracking tables for multi-profile isolation
-- ==========================================

-- 1. Diet Plan
ALTER TABLE public.diet_plan ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_diet_plan_profile_id ON public.diet_plan(profile_id);

-- 2. Daily Exercise
ALTER TABLE public.daily_exercise ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_daily_exercise_profile_id ON public.daily_exercise(profile_id);

-- 3. Daily Sleep
ALTER TABLE public.daily_sleep ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_daily_sleep_profile_id ON public.daily_sleep(profile_id);

-- 4. Daily Water
ALTER TABLE public.daily_water ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_daily_water_profile_id ON public.daily_water(profile_id);

-- 5. Daily Stress
ALTER TABLE public.daily_stress ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_daily_stress_profile_id ON public.daily_stress(profile_id);

-- 5b. Main Daily Tracking
ALTER TABLE public.daily_tracking ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_daily_tracking_profile_id ON public.daily_tracking(profile_id);

-- 6. Update unique constraints to be profile-aware
-- Diet
ALTER TABLE public.diet_plan DROP CONSTRAINT IF EXISTS unique_user_date;
ALTER TABLE public.diet_plan DROP CONSTRAINT IF EXISTS unique_guest_date;
ALTER TABLE public.diet_plan DROP CONSTRAINT IF EXISTS diet_plan_profile_date_unique;
ALTER TABLE public.diet_plan ADD CONSTRAINT diet_plan_profile_date_unique UNIQUE NULLS NOT DISTINCT (profile_id, date);

-- Exercise
ALTER TABLE public.daily_exercise DROP CONSTRAINT IF EXISTS unique_exercise_user_date;
ALTER TABLE public.daily_exercise DROP CONSTRAINT IF EXISTS unique_exercise_guest_date;
ALTER TABLE public.daily_exercise DROP CONSTRAINT IF EXISTS daily_exercise_profile_date_unique;
ALTER TABLE public.daily_exercise ADD CONSTRAINT daily_exercise_profile_date_unique UNIQUE NULLS NOT DISTINCT (profile_id, date);

-- Sleep
ALTER TABLE public.daily_sleep DROP CONSTRAINT IF EXISTS unique_sleep_user_date;
ALTER TABLE public.daily_sleep DROP CONSTRAINT IF EXISTS unique_sleep_guest_date;
ALTER TABLE public.daily_sleep DROP CONSTRAINT IF EXISTS daily_sleep_profile_date_unique;
ALTER TABLE public.daily_sleep ADD CONSTRAINT daily_sleep_profile_date_unique UNIQUE NULLS NOT DISTINCT (profile_id, date);

-- Water
ALTER TABLE public.daily_water DROP CONSTRAINT IF EXISTS unique_water_user_date;
ALTER TABLE public.daily_water DROP CONSTRAINT IF EXISTS unique_water_guest_date;
ALTER TABLE public.daily_water DROP CONSTRAINT IF EXISTS daily_water_profile_date_unique;
ALTER TABLE public.daily_water ADD CONSTRAINT daily_water_profile_date_unique UNIQUE NULLS NOT DISTINCT (profile_id, date);

-- Stress
ALTER TABLE public.daily_stress DROP CONSTRAINT IF EXISTS unique_stress_user_date;
ALTER TABLE public.daily_stress DROP CONSTRAINT IF EXISTS unique_stress_guest_date;
ALTER TABLE public.daily_stress DROP CONSTRAINT IF EXISTS daily_stress_profile_date_unique;
ALTER TABLE public.daily_stress ADD CONSTRAINT daily_stress_profile_date_unique UNIQUE NULLS NOT DISTINCT (profile_id, date);

-- Daily Tracking Main
ALTER TABLE public.daily_tracking DROP CONSTRAINT IF EXISTS daily_tracking_user_date_unique;
ALTER TABLE public.daily_tracking DROP CONSTRAINT IF EXISTS daily_tracking_profile_date_unique;
ALTER TABLE public.daily_tracking ADD CONSTRAINT daily_tracking_profile_date_unique UNIQUE NULLS NOT DISTINCT (profile_id, date);

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
