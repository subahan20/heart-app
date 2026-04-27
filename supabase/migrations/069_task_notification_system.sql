-- ==========================================
-- Task Management System
-- 1. Create tasks table
-- 2. Setup automated 10-minute notifications
-- ==========================================

-- 1. Create the tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for both registered users and guests
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks" ON public.tasks 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own tasks" ON public.tasks;
CREATE POLICY "Guests can manage own tasks" ON public.tasks 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_guest_id ON public.tasks(guest_session_id);

-- 2. Schedule the 10-minute notification worker
-- We use the system_settings table we created earlier for URL and keys
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'check-tasks-notify';

SELECT cron.schedule('check-tasks-notify', '*/10 * * * *', 
    $$ SELECT net.http_post(
        url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/check-tasks-notify', 
        headers := jsonb_build_object(
            'Content-Type', 'application/json', 
            'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')
        ), 
        body := '{}'::jsonb
    ); $$);

-- Add some initial test data (optional but helpful for verification)
INSERT INTO public.tasks (title, completed) 
VALUES ('Set up Health App', true), ('Log today''s meals', false)
ON CONFLICT DO NOTHING;
