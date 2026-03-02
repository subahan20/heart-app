-- Migration: 045_fix_missing_updated_at.sql
-- Description: Ensure updated_at column exists on tables where update triggers are attached

-- 1. Ensure updated_at exists on patient_details
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patient_details' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.patient_details ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Ensure updated_at exists on checkins
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checkins' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.checkins ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Ensure updated_at exists on ai_recommendations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_recommendations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.ai_recommendations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. Re-ensure the updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set it if the column exists in the record
    BEGIN
        NEW.updated_at = now();
    EXCEPTION WHEN undefined_column THEN
        -- Safely ignore if column doesn't exist
    END;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Attach triggers to tables that were missing updated_at but might need it now
-- checkins
DROP TRIGGER IF EXISTS update_checkins_updated_at ON public.checkins;
CREATE TRIGGER update_checkins_updated_at 
    BEFORE UPDATE ON public.checkins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ai_recommendations
DROP TRIGGER IF EXISTS update_ai_recommendations_updated_at ON public.ai_recommendations;
CREATE TRIGGER update_ai_recommendations_updated_at 
    BEFORE UPDATE ON public.ai_recommendations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- patient_details (ensure it's attached)
DROP TRIGGER IF EXISTS update_patient_details_updated_at ON public.patient_details;
CREATE TRIGGER update_patient_details_updated_at 
    BEFORE UPDATE ON public.patient_details 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
