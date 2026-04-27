-- ==========================================
-- 085_fix_profile_onboarding.sql
-- Add onboarding status to profiles and fix user_streaks linking
-- ==========================================

-- 1. Add onboarding_complete to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- 2. Ensure user_streaks has profile_id and is correctly linked
-- Migration 084 should have renamed patient_id to profile_id, but let's be sure.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'profile_id') THEN
            ALTER TABLE public.user_streaks ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_user_streaks_profile_id ON public.user_streaks(profile_id);
        END IF;
    END IF;
END $$;

-- 3. RLS for user_streaks (Ensure it's profile-scoped)
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own streaks" ON public.user_streaks;
CREATE POLICY "Users can manage own streaks" ON public.user_streaks
    FOR ALL USING (
        profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR 
        guest_session_id IS NOT NULL -- Allow guest access if needed
    );

NOTIFY pgrst, 'reload schema';
