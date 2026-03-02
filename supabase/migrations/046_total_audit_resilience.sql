-- Migration: 046_total_audit_resilience.sql
-- Description: Comprehensive fix for missing updated_at columns and fragile trigger functions

-- 1. Create a Master Robust Trigger Function
-- This function uses to_jsonb to safely check if the updated_at field exists before assigning to it.
-- This effectively prevents the "record new has no field updated_at" error (42703).
CREATE OR REPLACE FUNCTION public.robust_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (to_jsonb(NEW) ? 'updated_at') THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update existing fragile trigger functions to use the robust logic
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF (to_jsonb(NEW) ? 'updated_at') THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (to_jsonb(NEW) ? 'updated_at') THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_feature_persistence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF (to_jsonb(NEW) ? 'updated_at') THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. List of tables to ensure have updated_at column
DO $$
DECLARE
    t TEXT;
    v_tables TEXT[] := ARRAY[
        'patient_details', 'checkins', 'ai_recommendations', 
        'bp_readings', 'sugar_readings', 'exercise_sessions', 
        'daily_logs', 'activity_sessions', 'diet_plan', 
        'daily_exercise', 'daily_sleep', 'daily_water', 
        'daily_stress', 'daily_insights', 'notifications', 
        'chat_messages', 'consultation_requests', 'feature_persistence', 
        'transformation_plans', 'daily_streaks', 'patient_streak'
    ];
BEGIN
    FOREACH t IN ARRAY v_tables LOOP
        -- Add updated_at if missing
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = t 
                AND column_name = 'updated_at'
            ) THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', t);
            END IF;

            -- Attach/Re-attach the robust trigger
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_updated_at ON public.%I', t);
            EXECUTE format('CREATE TRIGGER trg_audit_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.robust_update_updated_at()', t);
        END IF;
    END LOOP;
END $$;
