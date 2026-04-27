-- ==========================================
-- 082_fix_all_profile_constraints.sql
-- Fix the 23505 Duplicate Key error for multi-profile accounts
-- ==========================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['diet_plan', 'daily_sleep', 'daily_water', 'daily_stress', 'user_daily_tracking', 'daily_tracking', 'transformation_plans']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            
            -- 0. Ensure user_daily_tracking has all required columns for the frontend hooks
            IF t = 'user_daily_tracking' THEN
                ALTER TABLE public.user_daily_tracking ADD COLUMN IF NOT EXISTS diet_completed BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE public.user_daily_tracking ADD COLUMN IF NOT EXISTS mental_completed BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE public.user_daily_tracking ADD COLUMN IF NOT EXISTS all_completed BOOLEAN NOT NULL DEFAULT FALSE;
                -- Sync stress -> mental if one exists but not the other
                UPDATE public.user_daily_tracking SET mental_completed = stress_completed WHERE stress_completed = TRUE AND mental_completed = FALSE;
            END IF;

            IF t = 'transformation_plans' THEN
                ALTER TABLE public.transformation_plans DROP CONSTRAINT IF EXISTS unique_user_week;
                ALTER TABLE public.transformation_plans DROP CONSTRAINT IF EXISTS unique_guest_week;
            END IF;

            -- 1. DROP the legacy "user-only" constraints that are blocking multi-profile data
            -- If user A has two profiles, they share user_id, but need different rows for the same date.
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_unified_upsert_key', t, t);
            -- Also drop it if it exists as an index instead of a constraint
            EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_unified_upsert', t);
            -- Also drop this specific one found in user_daily_tracking
            EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_upsert_unique', t);
            EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_unified_upsert_unique', t);
            IF t = 'user_daily_tracking' THEN
                DROP INDEX IF EXISTS public.idx_user_daily_tracking_upsert_unique;
            END IF;

            -- 2. ENSURE patient_id is NOT NULL (Backfill first)
            -- (Backfill happened in 079 and 081, but we'll do a safety pass)
            EXECUTE format('UPDATE public.%I t SET patient_id = (SELECT id FROM public.patient_details p WHERE p.user_id = t.user_id OR p.guest_session_id = t.guest_session_id LIMIT 1) WHERE t.patient_id IS NULL', t);
            
            -- 3. APPLY the MASTER Profile-Aware Unique Constraint
            -- Use NULLS NOT DISTINCT just in case, though patient_id should be present now.
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_patient_date_unique', t, t);
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_patient_id_date_key', t, t);
            
            IF t = 'transformation_plans' THEN
                EXECUTE format('
                    ALTER TABLE public.%I ADD CONSTRAINT %I_patient_week_unique 
                    UNIQUE (patient_id, week_number)
                ', t, t);
            ELSE
                EXECUTE format('
                    ALTER TABLE public.%I ADD CONSTRAINT %I_patient_date_unique 
                    UNIQUE NULLS NOT DISTINCT (patient_id, date)
                ', t, t);
            END IF;

        END IF;
    END LOOP;
END $$;

-- 4. Fix bp_readings and sugar_readings too (If they exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bp_readings') THEN
        CREATE INDEX IF NOT EXISTS idx_bp_readings_patient_id ON public.bp_readings(patient_id);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sugar_readings') THEN
        CREATE INDEX IF NOT EXISTS idx_sugar_readings_patient_id ON public.sugar_readings(patient_id);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
