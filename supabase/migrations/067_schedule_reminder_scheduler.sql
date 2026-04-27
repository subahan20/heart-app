-- ==========================================
-- 067_schedule_reminder_scheduler.sql
-- Schedule the reminder-scheduler to run every 30 minutes
-- ==========================================

-- Enable pg_cron if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Safely remove existing job if any
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'reminder-scheduler';

-- Schedule every 30 minutes
-- Note: Requires app.supabase_url and app.service_role_key in DB settings
SELECT cron.schedule(
    'reminder-scheduler',
    '*/30 * * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/reminder-scheduler',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
