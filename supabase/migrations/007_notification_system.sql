-- ==========================================
-- 007_notification_system.sql
-- Unified Notifications and Deduplication
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.notifications;
CREATE POLICY "Users and Guests can manage own data" 
    ON public.notifications FOR ALL 
    USING (auth.uid() = user_id OR guest_session_id IS NOT NULL);

-- Cleanup Duplicates which would block Unique Index creation
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.id < b.id
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND a.guest_session_id IS NOT DISTINCT FROM b.guest_session_id
  AND a.date = b.date
  AND a.category = b.category
  AND a.type = b.type;

-- Indices
-- Master composite unique index for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_upsert_unique ON public.notifications (
    user_id, 
    guest_session_id, 
    date, 
    category,
    type
) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_guest_session_id ON public.notifications(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON public.notifications(date DESC);
