DO $$
DECLARE
    t TEXT;
BEGIN
    -- Only loop through tables that have a single 'date' column for daily tracking
    FOREACH t IN ARRAY ARRAY['diet_plan', 'daily_sleep', 'daily_water', 'daily_stress']
    LOOP
        -- 1. Remove old constraints that conflict with the new unified index
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_user_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_guest_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_exercise_user_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_exercise_guest_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_sleep_user_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_sleep_guest_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_water_user_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_water_guest_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_stress_user_date', t);
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS unique_stress_guest_date', t);
        
        -- 2. DEDUPLICATE: Keep only the most recent record per day/user/guest
        -- This resolves the 23505 error by cleaning up existing duplicates
        EXECUTE format('
            DELETE FROM public.%I a
            USING public.%I b
            WHERE a.id < b.id
              AND a.user_id IS NOT DISTINCT FROM b.user_id
              AND a.guest_session_id IS NOT DISTINCT FROM b.guest_session_id
              AND a.date = b.date
        ', t, t);

        -- 3. Create the Master Unified Unique Index
        EXECUTE format('DROP INDEX IF EXISTS public.idx_%I_unified_upsert', t);
        EXECUTE format('
            CREATE UNIQUE INDEX idx_%I_unified_upsert 
            ON public.%I (user_id, guest_session_id, date) 
            NULLS NOT DISTINCT
        ', t, t);
    END LOOP;
END $$;
