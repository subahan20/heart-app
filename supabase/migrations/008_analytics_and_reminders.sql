-- ==========================================
-- 008_analytics_and_reminders.sql
-- BMI and Completion Tracking
-- ==========================================

-- Health Information (Calculated BMI, etc.)
CREATE TABLE IF NOT EXISTS public.health_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    bmi DECIMAL(4,1),
    bmi_status VARCHAR(20),
    bmi_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Completion Tracking (Daily Goals Status)
CREATE TABLE IF NOT EXISTS public.user_daily_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    breakfast_completed BOOLEAN NOT NULL DEFAULT FALSE,
    lunch_completed BOOLEAN NOT NULL DEFAULT FALSE,
    snacks_completed BOOLEAN NOT NULL DEFAULT FALSE,
    dinner_completed BOOLEAN NOT NULL DEFAULT FALSE,
    exercise_completed BOOLEAN NOT NULL DEFAULT FALSE,
    water_completed BOOLEAN NOT NULL DEFAULT FALSE,
    sleep_completed BOOLEAN NOT NULL DEFAULT FALSE,
    stress_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers
DROP TRIGGER IF EXISTS update_health_information_updated_at ON public.health_information;
CREATE TRIGGER update_health_information_updated_at BEFORE UPDATE ON public.health_information FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_daily_tracking_updated_at ON public.user_daily_tracking;
CREATE TRIGGER update_user_daily_tracking_updated_at BEFORE UPDATE ON public.user_daily_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.health_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_tracking ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    -- 1. Apply RLS Policies
    FOREACH t IN ARRAY ARRAY['health_information', 'user_daily_tracking']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Users and Guests can manage own data" ON public.%I FOR ALL USING (auth.uid() = user_id OR guest_session_id IS NOT NULL)', t);
    END LOOP;

    -- 2. Cleanup Duplicates for user_daily_tracking
    DELETE FROM public.user_daily_tracking a
    USING public.user_daily_tracking b
    WHERE a.id < b.id
      AND a.user_id IS NOT DISTINCT FROM b.user_id
      AND a.guest_session_id IS NOT DISTINCT FROM b.guest_session_id
      AND a.date = b.date;

    -- 3. Cleanup Duplicates for health_information (keep only latest single profile per user/guest if they managed to get multiple)
    DELETE FROM public.health_information a
    USING public.health_information b
    WHERE a.id < b.id
      AND a.user_id IS NOT DISTINCT FROM b.user_id
      AND a.guest_session_id IS NOT DISTINCT FROM b.guest_session_id;
END $$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_health_information_user_id ON public.health_information(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_daily_tracking_upsert_unique ON public.user_daily_tracking (
    user_id, 
    guest_session_id, 
    date
) NULLS NOT DISTINCT;
