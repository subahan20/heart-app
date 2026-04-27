-- ==========================================
-- 089_fix_transformation_foreign_key.sql
-- Fix 23503: Foreign key violation on transformation_plans
-- ==========================================

DO $$ 
DECLARE
    v_id_type TEXT;
BEGIN
    -- 1. Get the current type of profiles.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id';

    -- 2. Clean up transformation_plans
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transformation_plans' AND column_name = 'patient_id') THEN
        ALTER TABLE public.transformation_plans RENAME COLUMN patient_id TO profile_id;
    END IF;

    -- [CRITICAL] Delete orphaned records that don't exist in profiles
    -- This prevents the "Key (profile_id)=(X) is not present in table profiles" error
    DELETE FROM public.transformation_plans WHERE profile_id IS NOT NULL AND profile_id NOT IN (SELECT id FROM public.profiles);

    ALTER TABLE public.transformation_plans DROP CONSTRAINT IF EXISTS transformation_plans_patient_id_fkey;
    ALTER TABLE public.transformation_plans DROP CONSTRAINT IF EXISTS transformation_plans_profile_id_fkey;

    IF v_id_type = 'integer' THEN
        ALTER TABLE public.transformation_plans ALTER COLUMN profile_id TYPE INTEGER USING profile_id::integer;
    ELSE
        ALTER TABLE public.transformation_plans ALTER COLUMN profile_id TYPE UUID USING profile_id::uuid;
    END IF;

    ALTER TABLE public.transformation_plans 
        ADD CONSTRAINT transformation_plans_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- 3. Clean up diet_plan
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'diet_plan' AND column_name = 'patient_id') THEN
        ALTER TABLE public.diet_plan RENAME COLUMN patient_id TO profile_id;
    END IF;
    
    -- [CRITICAL] Delete orphaned records
    DELETE FROM public.diet_plan WHERE profile_id IS NOT NULL AND profile_id NOT IN (SELECT id FROM public.profiles);

    ALTER TABLE public.diet_plan DROP CONSTRAINT IF EXISTS diet_plan_patient_id_fkey;
    ALTER TABLE public.diet_plan DROP CONSTRAINT IF EXISTS diet_plan_profile_id_fkey;
    ALTER TABLE public.diet_plan ADD CONSTRAINT diet_plan_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

END $$;

NOTIFY pgrst, 'reload schema';
