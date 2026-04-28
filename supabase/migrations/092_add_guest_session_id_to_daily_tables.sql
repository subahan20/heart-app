-- Add guest_session_id to all daily aggregate tables to support guest mode tracking

DO $$
BEGIN
    -- daily_exercise
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_exercise' AND column_name = 'guest_session_id') THEN
        ALTER TABLE public.daily_exercise ADD COLUMN guest_session_id UUID;
    END IF;

    -- daily_water
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_water' AND column_name = 'guest_session_id') THEN
        ALTER TABLE public.daily_water ADD COLUMN guest_session_id UUID;
    END IF;

    -- daily_sleep
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_sleep' AND column_name = 'guest_session_id') THEN
        ALTER TABLE public.daily_sleep ADD COLUMN guest_session_id UUID;
    END IF;

    -- daily_stress
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_stress' AND column_name = 'guest_session_id') THEN
        ALTER TABLE public.daily_stress ADD COLUMN guest_session_id UUID;
    END IF;

    -- diet_plan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'diet_plan' AND column_name = 'guest_session_id') THEN
        ALTER TABLE public.diet_plan ADD COLUMN guest_session_id UUID;
    END IF;
END $$;
