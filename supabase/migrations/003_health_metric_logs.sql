-- ==========================================
-- 003_health_metric_logs.sql
-- Core Health Metric Logs with Guest Support
-- ==========================================

-- Blood Pressure
CREATE TABLE IF NOT EXISTS public.bp_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    reading_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blood Sugar
CREATE TABLE IF NOT EXISTS public.sugar_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    glucose DECIMAL(5,1) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'fasting', 'post_meal', 'random'
    reading_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise Sessions
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    exercise_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    intensity VARCHAR(20) NOT NULL,
    estimated_calories INTEGER,
    exercise_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.bp_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugar_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['bp_readings', 'sugar_readings', 'exercise_sessions']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Users and Guests can manage own data" ON public.%I FOR ALL USING (auth.uid() = user_id OR guest_session_id IS NOT NULL)', t);
    END LOOP;
END $$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_bp_readings_user_id ON public.bp_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_bp_readings_date ON public.bp_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_sugar_readings_user_id ON public.sugar_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_sugar_readings_date ON public.sugar_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user_id ON public.exercise_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_date ON public.exercise_sessions(exercise_date);
