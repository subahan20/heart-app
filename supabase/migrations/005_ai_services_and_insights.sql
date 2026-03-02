-- ==========================================
-- 005_ai_services_and_insights.sql
-- AI Content, Recommendations, and History
-- ==========================================

-- AI-generated Diet Plans
CREATE TABLE IF NOT EXISTS public.diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    plan_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Recommendations
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    recommendation_data JSONB NOT NULL,
    context_data JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Health Insights History
CREATE TABLE IF NOT EXISTS public.daily_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    insights JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers
DROP TRIGGER IF EXISTS update_daily_insights_updated_at ON public.daily_insights;
CREATE TRIGGER update_daily_insights_updated_at BEFORE UPDATE ON public.daily_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_insights ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['diet_plans', 'recommendations', 'daily_insights']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Users and Guests can manage own data" ON public.%I FOR ALL USING (auth.uid() = user_id OR guest_session_id IS NOT NULL)', t);
    END LOOP;
END $$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_daily_insights_user_date ON public.daily_insights(user_id, date);
