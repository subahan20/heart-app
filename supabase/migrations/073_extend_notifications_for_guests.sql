-- ==========================================
-- 073_extend_notifications_for_guests.sql
-- Add guest support to notifications and tasks
-- ==========================================

-- Allow guests to have persistent notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS guest_session_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS guest_session_id TEXT;

-- Index for performance in guest lookups
CREATE INDEX IF NOT EXISTS idx_notifications_guest_session_id ON public.notifications(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_guest_session_id ON public.tasks(guest_session_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
