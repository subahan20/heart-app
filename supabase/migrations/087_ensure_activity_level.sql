-- ==========================================
-- 087_ensure_activity_level.sql
-- Ensure activity_level exists and refresh schema cache
-- ==========================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'profiles' 
                       AND column_name = 'activity_level') THEN
            ALTER TABLE public.profiles ADD COLUMN activity_level TEXT;
        END IF;
    END IF;
END $$;

-- Force PostgREST to refresh the schema cache
NOTIFY pgrst, 'reload schema';
