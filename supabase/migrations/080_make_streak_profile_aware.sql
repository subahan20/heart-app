-- ==========================================
-- 080_make_streak_profile_aware.sql
-- Ensure patient streaks are isolated per profile
-- ==========================================

DO $$
DECLARE
    id_type TEXT;
BEGIN
    -- 1. Detect the type of patient_details(id)
    SELECT data_type INTO id_type 
    FROM information_schema.columns 
    WHERE table_name = 'patient_details' AND column_name = 'id';
    
    IF id_type IS NULL THEN id_type := 'uuid'; END IF;

    -- 2. Upgrade patient_streak table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_streak') THEN
        
        -- Add patient_id column
        ALTER TABLE public.patient_streak ADD COLUMN IF NOT EXISTS patient_id %s REFERENCES public.patient_details(id);
        
        -- Backfill patient_id
        UPDATE public.patient_streak s
        SET patient_id = (
            SELECT id FROM public.patient_details p 
            WHERE p.user_id = s.user_id OR p.guest_session_id = s.guest_session_id
            LIMIT 1
        )
        WHERE s.patient_id IS NULL;

        -- Add Unique Constraint
        ALTER TABLE public.patient_streak DROP CONSTRAINT IF EXISTS patient_streak_patient_id_key;
        ALTER TABLE public.patient_streak ADD CONSTRAINT patient_streak_patient_id_key UNIQUE (patient_id);
        
        -- Remove the "One streak per guest/user" limit to allow multi-profile streaks
        ALTER TABLE public.patient_streak DROP CONSTRAINT IF EXISTS patient_streak_user_id_key;
        ALTER TABLE public.patient_streak DROP CONSTRAINT IF EXISTS patient_streak_guest_session_id_key;
    END IF;

END $$;

NOTIFY pgrst, 'reload schema';
