-- ==========================================
-- 056_daily_notifications_table.sql
-- Daily Notification Counter
-- Tracks how many reminder notifications have been sent per user per day.
-- Max = 5. Resets automatically next day via fresh row on new date.
-- ==========================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.daily_notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id    TEXT,
    date                DATE NOT NULL DEFAULT CURRENT_DATE,
    notifications_sent  INTEGER NOT NULL DEFAULT 0
        CONSTRAINT max_five_per_day CHECK (notifications_sent <= 5),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT daily_notifications_user_date_unique
        UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, date)
);

-- 2. UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS update_daily_notifications_updated_at ON public.daily_notifications;
CREATE TRIGGER update_daily_notifications_updated_at
    BEFORE UPDATE ON public.daily_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_daily_notifications_user_date
    ON public.daily_notifications(user_id, date DESC);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.daily_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily_notifications" ON public.daily_notifications;
CREATE POLICY "Users can manage own daily_notifications"
    ON public.daily_notifications FOR ALL
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR
        (guest_session_id IS NOT NULL AND user_id IS NULL)
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR
        (guest_session_id IS NOT NULL AND user_id IS NULL)
    );

-- 5. HELPER: Try to increment notification count for a user/day.
--    Returns TRUE if a notification slot was consumed, FALSE if capped at 5.
CREATE OR REPLACE FUNCTION public.try_consume_notification_slot(
    p_user_id UUID,
    p_date    DATE
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current INTEGER;
BEGIN
    -- Upsert: create row if first notification today, else check cap
    INSERT INTO public.daily_notifications (user_id, date, notifications_sent)
    VALUES (p_user_id, p_date, 1)
    ON CONFLICT (user_id, guest_session_id, date) DO UPDATE
        SET notifications_sent = daily_notifications.notifications_sent + 1,
            updated_at = NOW()
        WHERE daily_notifications.notifications_sent < 5
    RETURNING notifications_sent INTO v_current;

    -- If no row was updated/inserted (because cap was already reached), return FALSE
    IF v_current IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_consume_notification_slot(UUID, DATE) TO service_role;
