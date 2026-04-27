-- ==========================================
-- 072_fix_users_rls.sql
-- Fix RLS violations on the users table
-- ==========================================

-- Allow users to manage their own records (needed for upsert/insert)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;

CREATE POLICY "Users can manage own profile" 
    ON public.users 
    FOR ALL 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Note: This ensures that even if the handle_new_user trigger fails, 
-- the frontend can still create or update the user's record on completion.
