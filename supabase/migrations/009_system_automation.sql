-- ==========================================
-- 009_system_automation.sql
-- Storage and Cron Jobs
-- ==========================================

-- 1. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
END $$;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'food-images');
CREATE POLICY "Anyone can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'food-images');
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (auth.uid() = (storage.foldername(name))[1]::uuid AND bucket_id = 'food-images');

-- 2. Cron Jobs (Health Checks & Reminders)
-- Note: Requires app.settings.supabase_url and app.settings.service_role_key in DB settings

-- Daily health completion check (20:00 IST / 14:30 UTC)
SELECT cron.unschedule('daily-health-check');
SELECT cron.schedule(
    'daily-health-check',
    '30 14 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-health-check',
        headers := jsonb_build_object(
            'Content-Type', 'application/json', 
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    )
    $$
);

-- Daily health reminder notification (19:00 IST / 13:30 UTC)
SELECT cron.unschedule('daily-health-reminder');
SELECT cron.schedule(
    'daily-health-reminder',
    '0 13 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json', 
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    )
    $$
);
