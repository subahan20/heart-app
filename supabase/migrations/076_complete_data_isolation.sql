-- ==========================================
-- 076_complete_data_isolation.sql
-- Ensure ALL health and tracking records are private per family member
-- ==========================================

-- 1. Add patient_id to ALL health and tracking tables
ALTER TABLE public.bp_readings ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.sugar_readings ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.health_information ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.health_screenings ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.diet_plan ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.daily_sleep ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.daily_water ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.daily_stress ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.activity_sessions ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.user_daily_tracking ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_bp_readings_patient_id ON public.bp_readings(patient_id);
CREATE INDEX IF NOT EXISTS idx_sugar_readings_patient_id ON public.sugar_readings(patient_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_patient_id ON public.recommendations(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_information_patient_id ON public.health_information(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_screenings_patient_id ON public.health_screenings(patient_id);
CREATE INDEX IF NOT EXISTS idx_diet_plan_patient_id ON public.diet_plan(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_sleep_patient_id ON public.daily_sleep(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_water_patient_id ON public.daily_water(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_stress_patient_id ON public.daily_stress(patient_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_patient_id ON public.activity_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_tracking_patient_id ON public.user_daily_tracking(patient_id);

-- 3. Update Unique Constraints (to allow John & Jane to have their own record on the same date)
-- We drop old indices and create new ones that include patient_id

DROP INDEX IF EXISTS idx_diet_plan_unified_upsert;
CREATE UNIQUE INDEX idx_diet_plan_patient_date ON public.diet_plan(patient_id, date);

DROP INDEX IF EXISTS idx_daily_sleep_unified_upsert;
CREATE UNIQUE INDEX idx_daily_sleep_patient_date ON public.daily_sleep(patient_id, date);

DROP INDEX IF EXISTS idx_daily_water_unified_upsert;
CREATE UNIQUE INDEX idx_daily_water_patient_date ON public.daily_water(patient_id, date);

DROP INDEX IF EXISTS idx_daily_stress_unified_upsert;
CREATE UNIQUE INDEX idx_daily_stress_patient_date ON public.daily_stress(patient_id, date);

DROP INDEX IF EXISTS idx_user_daily_tracking_unified_upsert;
CREATE UNIQUE INDEX idx_user_daily_tracking_patient_date ON public.user_daily_tracking(patient_id, date);

-- 4. Backfill existing records (Assign to the primary/first profile of each user)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'bp_readings', 'sugar_readings', 'recommendations', 'health_information', 'health_screenings',
        'diet_plan', 'daily_sleep', 'daily_water', 'daily_stress', 'activity_sessions', 'user_daily_tracking'
    )) LOOP
        EXECUTE format('
            UPDATE public.%I t
            SET patient_id = (SELECT id FROM public.patient_details p WHERE p.user_id = t.user_id OR p.guest_session_id = t.guest_session_id LIMIT 1)
            WHERE t.patient_id IS NULL', r.tablename);
    END LOOP;
END $$;

-- 5. Refresh Schema
NOTIFY pgrst, 'reload schema';
