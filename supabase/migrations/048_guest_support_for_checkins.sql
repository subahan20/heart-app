-- Migration: 048_guest_support_for_checkins.sql
-- Description: Relax user_id constraint and add guest_session_id to checkins and ai_recommendations

-- 1. Update checkins table
ALTER TABLE public.checkins 
ALTER COLUMN user_id DROP NOT NULL;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkins' AND column_name='guest_session_id') THEN
        ALTER TABLE public.checkins ADD COLUMN guest_session_id TEXT;
    END IF;
END $$;

-- 2. Update ai_recommendations table
ALTER TABLE public.ai_recommendations 
ALTER COLUMN user_id DROP NOT NULL;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_recommendations' AND column_name='guest_session_id') THEN
        ALTER TABLE public.ai_recommendations ADD COLUMN guest_session_id TEXT;
    END IF;
END $$;

-- 3. Update RLS policies to support guest sessions (matching other tables)
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.checkins;
CREATE POLICY "Users and guests can insert checkins" 
ON public.checkins FOR INSERT 
WITH CHECK (
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND guest_session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can view their own checkins" ON public.checkins;
CREATE POLICY "Users and guests can view checkins" 
ON public.checkins FOR SELECT 
USING (
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND guest_session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON public.ai_recommendations;
CREATE POLICY "Users and guests can insert recommendations" 
ON public.ai_recommendations FOR INSERT 
WITH CHECK (
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND guest_session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.ai_recommendations;
CREATE POLICY "Users and guests can view recommendations" 
ON public.ai_recommendations FOR SELECT 
USING (
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND guest_session_id IS NOT NULL)
);

-- 4. Add indexes for guest_session_id
CREATE INDEX IF NOT EXISTS idx_checkins_guest_session_id ON public.checkins(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_guest_session_id ON public.ai_recommendations(guest_session_id);

-- 5. Grant Permissions for Guests (anon role)
GRANT INSERT, SELECT ON public.checkins TO anon;
GRANT INSERT, SELECT ON public.ai_recommendations TO anon;
