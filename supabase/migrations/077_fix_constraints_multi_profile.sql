-- ==========================================
-- 077_fix_constraints_multi_profile.sql
-- Fix the ON CONFLICT mismatch error by ensuring correct unique indices exist
-- ==========================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN ARRAY ARRAY['diet_plan', 'daily_sleep', 'daily_water', 'daily_stress', 'user_daily_tracking']
    LOOP
        -- 1. DEDUPLICATE Legacy: Keep only one record per user/guest/date
        EXECUTE format('
            DELETE FROM public.%I a
            USING public.%I b
            WHERE a.id < b.id
              AND a.user_id IS NOT DISTINCT FROM b.user_id
              AND a.guest_session_id IS NOT DISTINCT FROM b.guest_session_id
              AND a.date = b.date
        ', t, t);

        -- 2. DEDUPLICATE Profile: Keep only one record per patient/date
        EXECUTE format('
            DELETE FROM public.%I a
            USING public.%I b
            WHERE a.id < b.id
              AND a.patient_id = b.patient_id
              AND a.date = b.date
              AND a.patient_id IS NOT NULL
        ', t, t);

        -- 3. Restore Legacy Unified Unique Index
        EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_unified_upsert', t);
        EXECUTE format('
            CREATE UNIQUE INDEX idx_%I_unified_upsert 
            ON public.%I (user_id, guest_session_id, date) 
            NULLS NOT DISTINCT
        ', t, t);

        -- 4. Restore/Fix Profile Unique Index
        EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_patient_date', t);
        EXECUTE format('
            CREATE UNIQUE INDEX idx_%I_patient_date 
            ON public.%I (patient_id, date) 
            WHERE (patient_id IS NOT NULL)
        ', t, t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
