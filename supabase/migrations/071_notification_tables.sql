-- ==========================================
-- 071_notification_tables.sql
-- 1. Create/Verify tasks, notifications, and user_tokens tables
-- 2. Schedule the 10-minute task checker
-- ==========================================

-- 1. Table: tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: user_tokens
CREATE TABLE IF NOT EXISTS public.user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, fcm_token)
);

-- Enable RLS on user_tokens
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tokens" ON public.user_tokens;
CREATE POLICY "Users can manage own tokens" ON public.user_tokens
    FOR ALL USING (auth.uid() = user_id);

-- 4. Scheduler: checkTasksAndNotify (running every 10 minutes)
-- We'll reuse the 'check-tasks-notify' name but ensure it runs every 10 mins.
-- Safely handle cron schema/unscheduling
DO $$ 
BEGIN
    PERFORM cron.unschedule(jobid) 
    FROM cron.job 
    WHERE jobname = 'check-tasks-notify';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- This schedule assumes public.system_settings exists from previous migrations (068 or similar)
SELECT cron.schedule('check-tasks-notify', '*/10 * * * *', 
    $$ SELECT net.http_post(
        url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/check-tasks-notify', 
        headers := jsonb_build_object(
            'Content-Type', 'application/json', 
            'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')
        ), 
        body := '{}'::jsonb
    ); $$);
