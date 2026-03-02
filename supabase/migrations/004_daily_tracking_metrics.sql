-- ==========================================
-- 004_daily_tracking_metrics.sql
-- Daily Tracking Tables (Snapshots)
-- ==========================================

-- Diet Snapshot
CREATE TABLE IF NOT EXISTS public.diet_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    meals JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_calories INTEGER DEFAULT 0,
    food_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise Snapshot
CREATE TABLE IF NOT EXISTS public.daily_exercise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_minutes INTEGER DEFAULT 0,
    total_calories INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sleep Snapshot
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Water Snapshot
CREATE TABLE IF NOT EXISTS public.daily_water (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    glasses INTEGER DEFAULT 0,
    total_ml INTEGER DEFAULT 0,
    goal_ml INTEGER DEFAULT 3000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stress Snapshot (Daily Stress)
CREATE TABLE IF NOT EXISTS public.daily_stress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    mental_stress INTEGER CHECK (mental_stress >= 1 AND mental_stress <= 10),
    breathing_sessions INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers
DROP TRIGGER IF EXISTS update_diet_plan_updated_at ON public.diet_plan;
CREATE TRIGGER update_diet_plan_updated_at BEFORE UPDATE ON public.diet_plan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_exercise_updated_at ON public.daily_exercise;
CREATE TRIGGER update_daily_exercise_updated_at BEFORE UPDATE ON public.daily_exercise FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_sleep_updated_at ON public.daily_sleep;
CREATE TRIGGER update_daily_sleep_updated_at BEFORE UPDATE ON public.daily_sleep FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_water_updated_at ON public.daily_water;
CREATE TRIGGER update_daily_water_updated_at BEFORE UPDATE ON public.daily_water FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_stress_updated_at ON public.daily_stress;
CREATE TRIGGER update_daily_stress_updated_at BEFORE UPDATE ON public.daily_stress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.diet_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_exercise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_water ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stress ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    -- 1. Apply RLS Policies
    FOREACH t IN ARRAY ARRAY['diet_plan', 'daily_exercise', 'daily_sleep', 'daily_water', 'daily_stress']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Users and Guests can manage own data" ON public.%I FOR ALL USING (auth.uid() = user_id OR guest_session_id IS NOT NULL)', t);
    END LOOP;

    -- 2. Cleanup Duplicates
    FOREACH t IN ARRAY ARRAY['diet_plan', 'daily_exercise', 'daily_sleep', 'daily_water', 'daily_stress']
    LOOP
        EXECUTE format('
            DELETE FROM public.%I a
            USING public.%I b
            WHERE a.id < b.id
              AND a.user_id IS NOT DISTINCT FROM b.user_id
              AND a.guest_session_id IS NOT DISTINCT FROM b.guest_session_id
              AND a.date = b.date
        ', t, t);
    END LOOP;
END $$;

-- Indices with NULLS NOT DISTINCT for reliable upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_diet_plan_user_guest_date_key ON public.diet_plan (user_id, guest_session_id, date) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_exercise_user_guest_date_key ON public.daily_exercise (user_id, guest_session_id, date) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sleep_user_guest_date_key ON public.daily_sleep (user_id, guest_session_id, date) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_water_user_guest_date_key ON public.daily_water (user_id, guest_session_id, date) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stress_user_guest_date_key ON public.daily_stress (user_id, guest_session_id, date) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_diet_plan_user_date ON public.diet_plan(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_exercise_user_date ON public.daily_exercise(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_sleep_user_date ON public.daily_sleep(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_water_user_date ON public.daily_water(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_stress_user_date ON public.daily_stress(user_id, date);
