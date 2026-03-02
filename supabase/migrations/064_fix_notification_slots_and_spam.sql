-- ============================================================
-- 064_fix_notification_slots_and_spam.sql
-- 1. ADD slot column to notifications for multi-reminder support
-- 2. UPDATE unique index to include slot
-- 3. ADD last_reminder timestamps to daily_tracking to prevent spam.
-- ============================================================

-- 1. ADD slot column to notifications
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS slot TEXT DEFAULT 'default';

-- 2. UPDATE Master composite unique index to include slot
DROP INDEX IF EXISTS public.idx_notifications_upsert_unique;
CREATE UNIQUE INDEX idx_notifications_upsert_unique ON public.notifications (
    user_id, 
    guest_session_id, 
    date, 
    category,
    type,
    slot
) NULLS NOT DISTINCT;

-- 3. ADD last_reminder timestamps to daily_tracking
ALTER TABLE public.daily_tracking
    ADD COLUMN IF NOT EXISTS last_diet_reminder_at      TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_exercise_reminder_at  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_sleep_reminder_at     TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_water_reminder_at     TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_mental_reminder_at    TIMESTAMP WITH TIME ZONE;

-- 4. UPDATE ATOMIC helper: increment a task's reminder counter and set timestamp
CREATE OR REPLACE FUNCTION public.increment_task_reminder(
    p_user_id   UUID,
    p_date      DATE,
    p_task      TEXT   -- 'diet' | 'exercise' | 'sleep' | 'water' | 'mental'
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sent_col  TEXT;
    v_limit_col TEXT;
    v_time_col  TEXT;
    v_sent      INT;
    v_limit     INT;
    v_new_sent  INT;
BEGIN
    -- Validate task name to prevent SQL injection
    IF p_task NOT IN ('diet', 'exercise', 'sleep', 'water', 'mental') THEN
        RAISE EXCEPTION 'Invalid task: %', p_task;
    END IF;

    v_sent_col  := p_task || '_reminders_sent';
    v_limit_col := p_task || '_reminder_limit';
    v_time_col  := 'last_' || p_task || '_reminder_at';

    -- Read current values
    EXECUTE format(
        'SELECT %I, %I FROM public.daily_tracking
         WHERE user_id = $1 AND date = $2
         FOR UPDATE',
        v_sent_col, v_limit_col
    ) INTO v_sent, v_limit USING p_user_id, p_date;

    IF v_sent IS NULL THEN
        RETURN -1; -- No row yet
    END IF;

    IF v_sent >= v_limit THEN
        RETURN -1; -- Cap reached
    END IF;

    v_new_sent := v_sent + 1;

    EXECUTE format(
        'UPDATE public.daily_tracking SET %I = $1, %I = NOW()
         WHERE user_id = $2 AND date = $3',
        v_sent_col, v_time_col
    ) USING v_new_sent, p_user_id, p_date;

    RETURN v_new_sent;
END;
$$;
