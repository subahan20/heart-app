-- ==========================================
-- Create Missing Daily Tracking Tables
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- Diet Plan Table
CREATE TABLE IF NOT EXISTS public.diet_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    meals JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_calories INTEGER DEFAULT 0,
    food_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraints for upsert operations
    CONSTRAINT unique_user_date UNIQUE (user_id, date),
    CONSTRAINT unique_guest_date UNIQUE (guest_session_id, date)
);

-- Daily Exercise Table
CREATE TABLE IF NOT EXISTS public.daily_exercise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_minutes INTEGER DEFAULT 0,
    total_calories INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraints for upsert operations
    CONSTRAINT unique_exercise_user_date UNIQUE (user_id, date),
    CONSTRAINT unique_exercise_guest_date UNIQUE (guest_session_id, date)
);

-- Daily Sleep Table
CREATE TABLE IF NOT EXISTS public.daily_sleep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    sleep_time TIME,
    wake_time TIME,
    duration_hours DECIMAL(3,1),
    quality VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraints for upsert operations
    CONSTRAINT unique_sleep_user_date UNIQUE (user_id, date),
    CONSTRAINT unique_sleep_guest_date UNIQUE (guest_session_id, date)
);

-- Daily Water Table
CREATE TABLE IF NOT EXISTS public.daily_water (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    glasses INTEGER DEFAULT 0,
    target_glasses INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraints for upsert operations
    CONSTRAINT unique_water_user_date UNIQUE (user_id, date),
    CONSTRAINT unique_water_guest_date UNIQUE (guest_session_id, date)
);

-- Daily Stress Table
CREATE TABLE IF NOT EXISTS public.daily_stress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraints for upsert operations
    CONSTRAINT unique_stress_user_date UNIQUE (user_id, date),
    CONSTRAINT unique_stress_guest_date UNIQUE (guest_session_id, date)
);

-- Enable RLS for all tables
ALTER TABLE public.diet_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_exercise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_water ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stress ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Diet Plan Policies
DROP POLICY IF EXISTS "Users can manage own diet plans" ON public.diet_plan;
CREATE POLICY "Users can manage own diet plans" ON public.diet_plan 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own diet plans" ON public.diet_plan;
CREATE POLICY "Guests can manage own diet plans" ON public.diet_plan 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Exercise Policies
DROP POLICY IF EXISTS "Users can manage own daily exercises" ON public.daily_exercise;
CREATE POLICY "Users can manage own daily exercises" ON public.daily_exercise 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own daily exercises" ON public.daily_exercise;
CREATE POLICY "Guests can manage own daily exercises" ON public.daily_exercise 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Sleep Policies
DROP POLICY IF EXISTS "Users can manage own daily sleep" ON public.daily_sleep;
CREATE POLICY "Users can manage own daily sleep" ON public.daily_sleep 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own daily sleep" ON public.daily_sleep;
CREATE POLICY "Guests can manage own daily sleep" ON public.daily_sleep 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Water Policies
DROP POLICY IF EXISTS "Users can manage own daily water" ON public.daily_water;
CREATE POLICY "Users can manage own daily water" ON public.daily_water 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own daily water" ON public.daily_water;
CREATE POLICY "Guests can manage own daily water" ON public.daily_water 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Stress Policies
DROP POLICY IF EXISTS "Users can manage own daily stress" ON public.daily_stress;
CREATE POLICY "Users can manage own daily stress" ON public.daily_stress 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own daily stress" ON public.daily_stress;
CREATE POLICY "Guests can manage own daily stress" ON public.daily_stress 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_diet_plan_user_date ON public.diet_plan(user_id, date);
CREATE INDEX IF NOT EXISTS idx_diet_plan_guest_date ON public.diet_plan(guest_session_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_exercise_user_date ON public.daily_exercise(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_exercise_guest_date ON public.daily_exercise(guest_session_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_sleep_user_date ON public.daily_sleep(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_sleep_guest_date ON public.daily_sleep(guest_session_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_water_user_date ON public.daily_water(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_water_guest_date ON public.daily_water(guest_session_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_stress_user_date ON public.daily_stress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_stress_guest_date ON public.daily_stress(guest_session_id, date);

-- Create Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS handle_diet_plan_updated_at ON public.diet_plan;
CREATE TRIGGER handle_diet_plan_updated_at
    BEFORE UPDATE ON public.diet_plan
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_daily_exercise_updated_at ON public.daily_exercise;
CREATE TRIGGER handle_daily_exercise_updated_at
    BEFORE UPDATE ON public.daily_exercise
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_daily_sleep_updated_at ON public.daily_sleep;
CREATE TRIGGER handle_daily_sleep_updated_at
    BEFORE UPDATE ON public.daily_sleep
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_daily_water_updated_at ON public.daily_water;
CREATE TRIGGER handle_daily_water_updated_at
    BEFORE UPDATE ON public.daily_water
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_daily_stress_updated_at ON public.daily_stress;
CREATE TRIGGER handle_daily_stress_updated_at
    BEFORE UPDATE ON public.daily_stress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
