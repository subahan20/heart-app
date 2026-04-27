-- ==========================================
-- 079_final_unique_constraints.sql
-- ULTIMATE GLOBAL MASTER FIX for Multi-Profile Support
-- ==========================================

DO $$
DECLARE
    t TEXT;
    id_type TEXT;
    has_user_id BOOLEAN;
    has_guest_id BOOLEAN;
    update_sql TEXT;
BEGIN
    -- 0. Detect the type of patient_details(id)
    SELECT data_type INTO id_type 
    FROM information_schema.columns 
    WHERE table_name = 'patient_details' AND column_name = 'id';
    
    -- Default to UUID if not found or different, but use detected if possible
    IF id_type IS NULL THEN id_type := 'uuid'; END IF;

    -- 1. Table Schema Upgrade: Notifications (Special Case)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS guest_session_id TEXT;
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS date DATE;
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
        -- Drop any legacy problematic indices found in user error reports
        DROP INDEX IF EXISTS public.idx_notifications_granular_unique_user;
    END IF;

    -- 2. Ensure patient_id exists with correct type & Intelligent Backfill
    FOR t IN (SELECT unnest(ARRAY[
        'bp_readings', 'sugar_readings', 'recommendations', 'health_information', 'health_screenings',
        'diet_plan', 'daily_sleep', 'daily_water', 'daily_stress', 'activity_sessions', 'user_daily_tracking',
        'daily_tracking', 'transformation_plans', 'feature_persistence', 'notifications'
    ])) LOOP
        -- Only proceed if the table actually exists
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            
            -- Add the patient_id column if it doesn't exist
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS patient_id %s REFERENCES public.patient_details(id)', t, id_type);
            
            -- Check for backfill pillars
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id') INTO has_user_id;
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'guest_session_id') INTO has_guest_id;
            
            -- Only backfill if we have at least one pillar
            IF has_user_id OR has_guest_id THEN
                update_sql := format('UPDATE public.%I t SET patient_id = (SELECT id FROM public.patient_details p WHERE ', t);
                
                IF has_user_id AND has_guest_id THEN
                    update_sql := update_sql || 'p.user_id = t.user_id OR p.guest_session_id = t.guest_session_id';
                ELSIF has_user_id THEN
                    update_sql := update_sql || 'p.user_id = t.user_id';
                ELSE
                    update_sql := update_sql || 'p.guest_session_id = t.guest_session_id';
                END IF;
                
                update_sql := update_sql || ' LIMIT 1) WHERE t.patient_id IS NULL';
                
                EXECUTE update_sql;
            END IF;
        END IF;
    END LOOP;

    -- 3. Deduplicate and Add Constraints for Focus Tracking Tables
    -- (Focuses on tables that use daily upserts by date or unique key)
    FOREACH t IN ARRAY ARRAY['diet_plan', 'daily_sleep', 'daily_water', 'daily_stress', 'user_daily_tracking', 'daily_tracking', 'transformation_plans', 'feature_persistence', 'notifications']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            
            -- Drop existing indices/constraints to prevent conflicts
            EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_unified_upsert', t);
            EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_patient_date', t);
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_patient_id_date_key', t, t);
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_unified_upsert_key', t, t);
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_user_date_unique', t, t); -- daily_tracking
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_user_id_feature_key_key', t, t); -- feature_persistence
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_guest_session_id_feature_key_key', t, t); -- feature_persistence
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_patient_id_feature_key', t, t);
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_patient_id_week_key', t, t);
            -- Also drop specifically named indexes that might exist
            EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_granular_unique_user', t);

            -- Definitive Constraints
            IF t = 'feature_persistence' THEN
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_unified_upsert_key UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, feature_key)', t, t);
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_patient_id_feature_key UNIQUE (patient_id, feature_key)', t, t);
            ELSIF t = 'transformation_plans' THEN
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_unified_upsert_key UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, week_number)', t, t);
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_patient_id_week_key UNIQUE (patient_id, week_number)', t, t);
            ELSIF t = 'notifications' THEN
                -- Explicitly match the service's onConflict string
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_unified_upsert_key UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, patient_id, date, category, type)', t, t);
            ELSE
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_unified_upsert_key UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, date)', t, t);
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_patient_id_date_key UNIQUE (patient_id, date)', t, t);
            END IF;
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
