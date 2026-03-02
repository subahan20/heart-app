-- ==========================================
-- 031_transformation_program.sql
-- 12-Week AI Transformation System
-- ==========================================

-- 1. Extend patient_details for Program State
ALTER TABLE public.patient_details 
ADD COLUMN IF NOT EXISTS transformation_start_date DATE,
ADD COLUMN IF NOT EXISTS transformation_goal TEXT CHECK (transformation_goal IN ('weight loss', 'maintenance', 'gain')),
ADD COLUMN IF NOT EXISTS transformation_badges JSONB DEFAULT '[]'::jsonb;

-- 2. Create Transformation Plans Table
CREATE TABLE IF NOT EXISTS public.transformation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 12),
    diet_plan JSONB NOT NULL,
    exercise_plan JSONB NOT NULL,
    suggestions TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'completed'
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraint: One plan per week per user
    CONSTRAINT unique_user_week UNIQUE (user_id, week_number),
    CONSTRAINT unique_guest_week UNIQUE (guest_session_id, week_number)
);

-- Triggers
DROP TRIGGER IF EXISTS update_transformation_plans_updated_at ON public.transformation_plans;
CREATE TRIGGER update_transformation_plans_updated_at 
    BEFORE UPDATE ON public.transformation_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.transformation_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and Guests can manage own transformation data" ON public.transformation_plans;
CREATE POLICY "Users and Guests can manage own transformation data" 
    ON public.transformation_plans FOR ALL 
    USING (auth.uid() = user_id OR guest_session_id IS NOT NULL);

-- Indices
CREATE INDEX IF NOT EXISTS idx_transformation_plans_user_week ON public.transformation_plans(user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_transformation_plans_guest_week ON public.transformation_plans(guest_session_id, week_number);
