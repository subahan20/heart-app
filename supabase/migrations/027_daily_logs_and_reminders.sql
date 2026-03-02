-- ==========================================
-- 027_daily_logs_and_reminders.sql
-- daily_logs table + pg_cron schedule
-- ==========================================

-- 1. Create daily_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    diet NUMERIC,           -- e.g. total_calories, or 1/0 for logged
    exercise NUMERIC,       -- e.g. minutes
    mental_stress NUMERIC,  -- e.g. score 1-10
    sleep NUMERIC,          -- e.g. hours
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Unique constraint: one record per user per day
ALTER TABLE public.daily_logs
    DROP CONSTRAINT IF EXISTS daily_logs_user_date_unique;
ALTER TABLE public.daily_logs
    ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);

-- 3. Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
    BEFORE UPDATE ON public.daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own logs" ON public.daily_logs;
CREATE POLICY "Users can manage own logs"
    ON public.daily_logs FOR ALL
    USING (auth.uid() = user_id);

-- 5. Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date
    ON public.daily_logs (user_id, date DESC);

-- ─────────────────────────────────────────────────────────────────
-- 6. Notifications unique constraint (idempotent, matches code)
-- ─────────────────────────────────────────────────────────────────
-- Drop old conflicting indexes that may cause 409/23505 errors
DROP INDEX IF EXISTS public.idx_notifications_granular_unique_guest;
DROP INDEX IF EXISTS public.idx_notifications_upsert_unique;

-- Create the single source-of-truth index
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unified_upsert
    ON public.notifications (user_id, guest_session_id, date, category, type)
    NULLS NOT DISTINCT;

-- ─────────────────────────────────────────────────────────────────
-- 7. pg_cron schedule for automated reminders
--    Requires pg_cron extension (enabled in Supabase dashboard)
-- ─────────────────────────────────────────────────────────────────

-- Enable pg_cron (run once, flag it as safe even if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing jobs to avoid duplicates
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname LIKE 'daily-reminder%';

-- 9:00 AM IST  = 3:30 AM UTC → diet reminder
SELECT cron.schedule(
    'daily-reminder-diet',
    '30 3 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/daily-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 6:00 PM IST  = 12:30 PM UTC → exercise reminder
SELECT cron.schedule(
    'daily-reminder-exercise',
    '30 12 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/daily-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 9:00 PM IST  = 3:30 PM UTC → stress reminder
SELECT cron.schedule(
    'daily-reminder-stress',
    '30 15 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/daily-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 10:30 PM IST = 5:00 PM UTC → sleep reminder
SELECT cron.schedule(
    'daily-reminder-sleep',
    '0 17 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/daily-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
