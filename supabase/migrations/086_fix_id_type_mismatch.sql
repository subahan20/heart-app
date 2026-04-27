-- ==========================================
-- 086_fix_id_type_mismatch.sql
-- Fix operator does not exist: integer = uuid
-- ==========================================

DO $$ 
DECLARE
    v_id_type TEXT;
BEGIN
    -- 1. Detect the type of profiles.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id';

    RAISE NOTICE 'Profiles ID type is: %', v_id_type;

    -- 2. Ensure user_streaks.profile_id matches this type
    IF v_id_type = 'integer' THEN
        -- If it's currently UUID, we need to drop and recreate or cast
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'profile_id' AND data_type = 'uuid') THEN
            ALTER TABLE public.user_streaks DROP COLUMN profile_id;
            ALTER TABLE public.user_streaks ADD COLUMN profile_id INTEGER REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    ELSIF v_id_type = 'uuid' THEN
        -- If it's currently integer, we need to drop and recreate
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'profile_id' AND data_type = 'integer') THEN
            ALTER TABLE public.user_streaks DROP COLUMN profile_id;
            ALTER TABLE public.user_streaks ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- 3. Repeat for other tables if necessary
    -- (This script can be expanded for bp_readings, sugar_readings, etc.)
END $$;

NOTIFY pgrst, 'reload schema';
