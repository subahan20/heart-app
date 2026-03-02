-- Migration: 042_health_checkin_system.sql
-- Description: Create tables for health check-ins and AI-powered recommendations

-- 1. Create checkins table
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL, -- in kg
    height DECIMAL(5,2) NOT NULL, -- in cm
    bmi DECIMAL(5,2) NOT NULL,
    systolic_bp INTEGER NOT NULL,
    diastolic_bp INTEGER NOT NULL,
    pulse_rate INTEGER NOT NULL,
    blood_sugar INTEGER NOT NULL,
    thyroid_status TEXT NOT NULL CHECK (thyroid_status IN ('normal', 'hypo', 'hyper')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Categories (computed and stored for convenience)
    bmi_category TEXT,
    bp_category TEXT,
    sugar_category TEXT
);

-- 2. Create ai_recommendations table
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL,
    diet_plan JSONB NOT NULL,
    exercise_plan JSONB NOT NULL,
    health_advice TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Users can only see/manage their own data)
CREATE POLICY "Users can insert their own checkins" 
ON public.checkins FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own checkins" 
ON public.checkins FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations" 
ON public.ai_recommendations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recommendations" 
ON public.ai_recommendations FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON public.ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_checkin_id ON public.ai_recommendations(checkin_id);

-- 6. Grant Permissions (standard Supabase roles)
GRANT ALL ON public.checkins TO authenticated;
GRANT ALL ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.checkins TO service_role;
GRANT ALL ON public.ai_recommendations TO service_role;
