-- ==========================================
-- 075_isolate_data_by_profile.sql
-- Ensure data (logs, alerts) is private per family member
-- ==========================================

-- 1. Add patient_id to key tables
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);
ALTER TABLE public.health_metric_logs ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patient_details(id);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON public.notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON public.tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_metric_logs_patient_id ON public.health_metric_logs(patient_id);

-- 3. Backfill existing records (Assign to the primary/first profile of each user)
UPDATE public.notifications n
SET patient_id = (SELECT id FROM public.patient_details p WHERE p.user_id = n.user_id OR p.guest_session_id = n.guest_session_id LIMIT 1)
WHERE n.patient_id IS NULL;

UPDATE public.tasks t
SET patient_id = (SELECT id FROM public.patient_details p WHERE p.user_id = t.user_id OR p.guest_session_id = t.guest_session_id LIMIT 1)
WHERE t.patient_id IS NULL;

UPDATE public.health_metric_logs h
SET patient_id = (SELECT id FROM public.patient_details p WHERE p.user_id = h.user_id OR p.guest_session_id = h.guest_session_id LIMIT 1)
WHERE h.patient_id IS NULL;

-- 4. Refresh Schema
NOTIFY pgrst, 'reload schema';
