-- ============================================================
-- 065_update_reminder_helpers_for_guests.sql
-- Update increment_task_reminder and mark_task_success_sent
-- to support guest_session_id (NULL user_id case).
-- ============================================================

-- 1. UPDATE increment_task_reminder to support Guest Sessions
CREATE OR REPLACE FUNCTION public.increment_task_reminder(
    p_user_id           UUID,
    p_guest_session_id  TEXT,
    p_date              DATE,
    p_task              TEXT   -- 'diet' | 'exercise' | 'sleep' | 'water' | 'mental'
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

    -- Read current values using FOR UPDATE to lock the row
    IF p_user_id IS NOT NULL THEN
        EXECUTE format(
            'SELECT %I, %I FROM public.daily_tracking
             WHERE user_id = $1 AND date = $2
             FOR UPDATE',
            v_sent_col, v_limit_col
        ) INTO v_sent, v_limit USING p_user_id, p_date;
    ELSE
        EXECUTE format(
            'SELECT %I, %I FROM public.daily_tracking
             WHERE guest_session_id = $1 AND user_id IS NULL AND date = $2
             FOR UPDATE',
            v_sent_col, v_limit_col
        ) INTO v_sent, v_limit USING p_guest_session_id, p_date;
    END IF;

    IF v_sent IS NULL THEN
        RETURN -1; -- No row yet
    END IF;

    IF v_sent >= v_limit THEN
        RETURN -1; -- Cap reached
    END IF;

    v_new_sent := v_sent + 1;

    -- Update the row
    IF p_user_id IS NOT NULL THEN
        EXECUTE format(
            'UPDATE public.daily_tracking SET %I = $1, %I = NOW()
             WHERE user_id = $2 AND date = $3',
            v_sent_col, v_time_col
        ) USING v_new_sent, p_user_id, p_date;
    ELSE
        EXECUTE format(
            'UPDATE public.daily_tracking SET %I = $1, %I = NOW()
             WHERE guest_session_id = $2 AND user_id IS NULL AND date = $3',
            v_sent_col, v_time_col
        ) USING v_new_sent, p_guest_session_id, p_date;
    END IF;

    RETURN v_new_sent;
END;
$$;

-- 2. UPDATE mark_task_success_sent to support Guest Sessions
CREATE OR REPLACE FUNCTION public.mark_task_success_sent(
    p_user_id           UUID,
    p_guest_session_id  TEXT,
    p_date              DATE,
    p_task              TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_col TEXT;
BEGIN
    IF p_task NOT IN ('diet', 'exercise', 'sleep', 'water', 'mental') THEN
        RAISE EXCEPTION 'Invalid task: %', p_task;
    END IF;

    v_col := p_task || '_success_sent';

    IF p_user_id IS NOT NULL THEN
        EXECUTE format(
            'UPDATE public.daily_tracking
             SET %I = TRUE
             WHERE user_id = $1 AND date = $2 AND %I = FALSE',
            v_col, v_col
        ) USING p_user_id, p_date;
    ELSE
        EXECUTE format(
            'UPDATE public.daily_tracking
             SET %I = TRUE
             WHERE guest_session_id = $1 AND user_id IS NULL AND date = $2 AND %I = FALSE',
            v_col, v_col
        ) USING p_guest_session_id, p_date;
    END IF;

    RETURN FOUND;
END;
$$;

-- 3. GRANTS
GRANT EXECUTE ON FUNCTION public.increment_task_reminder(UUID, TEXT, DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_task_success_sent(UUID, TEXT, DATE, TEXT)  TO service_role;
