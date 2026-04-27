-- ==========================================
-- 068_fix_cron_configuration.sql
-- Create system_settings table to bypass ALTER DATABASE permissions
-- ==========================================

-- 1. Create a simple table for configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Seed the Supabase URL
INSERT INTO public.system_settings (key, value)
VALUES ('supabase_url', 'https://hkjxjoykgeomwupjknou.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Initial placeholder for the Service Role Key
-- The user will update this via a simple UPDATE command
INSERT INTO public.system_settings (key, value)
VALUES ('service_role_key', 'PASTE_YOUR_KEY_HERE')
ON CONFLICT (key) DO NOTHING;

-- 4. Re-schedule cron jobs using subqueries
-- This ensures they always use the latest values from the table

-- A. Reminder Scheduler (Every 30 min)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reminder-scheduler';
SELECT cron.schedule(
    'reminder-scheduler',
    '*/30 * * * *',
    $$
    SELECT net.http_post(
        url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/reminder-scheduler',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- B. Daily Reminders (Specific times)
-- We'll just fix one to show it works, or all of them.
-- Let's do a loop for the daily-reminder jobs
DO $$
DECLARE
    job_name TEXT;
BEGIN
    FOR job_name IN SELECT jobname FROM cron.job WHERE jobname LIKE 'daily-reminder%'
    LOOP
        EXECUTE format('SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = %L', job_name);
    END LOOP;
END $$;

-- 9:00 AM IST
SELECT cron.schedule('daily-reminder-diet', '30 3 * * *', 
    $$ SELECT net.http_post(url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/daily-reminder', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')), body := '{}'::jsonb); $$);

-- 6:00 PM IST
SELECT cron.schedule('daily-reminder-exercise', '30 12 * * *', 
    $$ SELECT net.http_post(url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/daily-reminder', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')), body := '{}'::jsonb); $$);

-- 9:00 PM IST
SELECT cron.schedule('daily-reminder-stress', '30 15 * * *', 
    $$ SELECT net.http_post(url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/daily-reminder', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')), body := '{}'::jsonb); $$);

-- 10:30 PM IST
SELECT cron.schedule('daily-reminder-sleep', '0 17 * * *', 
    $$ SELECT net.http_post(url := (SELECT value FROM public.system_settings WHERE key = 'supabase_url') || '/functions/v1/daily-reminder', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM public.system_settings WHERE key = 'service_role_key')), body := '{}'::jsonb); $$);
