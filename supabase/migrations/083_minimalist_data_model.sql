-- ==========================================
-- 083_minimalist_data_model.sql
-- Align database with Minimalist (No Context) Architecture
-- ==========================================

-- 1. Ensure 'profiles' is available (Alias or Sync from patient_details)
-- We rename patient_details to profiles to match the user's design exactly.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patient_details') THEN
        ALTER TABLE public.patient_details RENAME TO profiles;
        -- Rename column if needed, but patient_details already has user_id and name
    END IF;
END $$;

-- 2. Create the Generic 'user_data' Table (MANDATORY)
-- This allows for any arbitrary profile data (meals, reminders, tasks)
CREATE TABLE IF NOT EXISTS public.user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- "task", "meal", "reminder", etc.
    value JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- "completed", "pending"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Standardize 'notifications' to use 'profile_id'
-- We keep 'patient_id' internally for backward compatibility but ensure the app can use 'profile_id'
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);
UPDATE public.notifications SET profile_id = patient_id WHERE profile_id IS NULL AND patient_id IS NOT NULL;

-- 4. Indices for Speed
CREATE INDEX IF NOT EXISTS idx_user_data_profile_type ON public.user_data(profile_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);

-- 5. RLS
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own profile data" ON public.user_data;
CREATE POLICY "Users can manage own profile data" ON public.user_data
    FOR ALL USING (
        profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

NOTIFY pgrst, 'reload schema';
