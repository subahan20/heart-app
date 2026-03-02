-- ==========================================
-- 055_cumulative_streak_no_reset.sql
-- CUMULATIVE ACHIEVEMENT STREAK — NEVER RESETS
--
-- Rules:
--   • Streak only increases, NEVER decreases or resets to 0
--   • +1 when all_completed becomes TRUE for a given date
--   • Duplicate prevention: if last_increment_date == today → no-op
--   • Missed days → streak stays exactly as-is
-- ==========================================

-- 1. STANDALONE INCREMENT FUNCTION (callable from daily_tracking trigger & Edge Function)
CREATE OR REPLACE FUNCTION public.increment_cumulative_streak(
    p_patient_id INTEGER,
    p_date       DATE
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- UPSERT: create streak row if none exists, or update if exists
    INSERT INTO public.patient_streak (patient_id, streak_count, daily_completed, last_completed_date)
    VALUES (p_patient_id, 1, TRUE, p_date)
    ON CONFLICT (patient_id) DO UPDATE SET
        -- Only increment if we haven't already counted today
        streak_count = CASE
            WHEN patient_streak.last_completed_date = p_date
                THEN patient_streak.streak_count          -- Already incremented today → no-op
            ELSE patient_streak.streak_count + 1          -- New day → always increment (NO reset)
        END,
        daily_completed    = TRUE,
        last_completed_date = p_date,
        updated_at         = NOW()
    -- Safety: never update if the stored date is somehow in the future (shouldn't happen)
    WHERE patient_streak.last_completed_date IS NULL
       OR patient_streak.last_completed_date <= p_date;
END;
$$;

-- 2. REWRITE THE TRIGGER FUNCTION used by the legacy activity-table triggers
--    (diet_plan, activity_sessions, daily_sleep, daily_water, daily_stress)
--    to also use cumulative logic.
CREATE OR REPLACE FUNCTION public.update_daily_completion_and_streak()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_uid   UUID;
    v_gid   TEXT;
    v_date  DATE;
    v_done  BOOLEAN;
    v_pid   INTEGER;
BEGIN
    v_uid := COALESCE(NEW.user_id, OLD.user_id);
    v_gid := COALESCE(NEW.guest_session_id, OLD.guest_session_id);

    IF TG_TABLE_NAME = 'activity_sessions' THEN
        v_date := DATE(COALESCE(NEW.start_time, OLD.start_time));
    ELSE
        v_date := COALESCE(NEW.date, OLD.date);
    END IF;

    -- Only evaluate for today (past records don't change streak)
    IF v_date <> CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    v_done := public.calculate_daily_completion(v_uid, v_gid, v_date);

    SELECT id INTO v_pid FROM public.patient_details
    WHERE (user_id IS NOT DISTINCT FROM v_uid)
      AND (guest_session_id IS NOT DISTINCT FROM v_gid);

    IF v_pid IS NOT NULL THEN
        IF v_done THEN
            -- CUMULATIVE increment — never reset
            PERFORM public.increment_cumulative_streak(v_pid, v_date);
        ELSE
            -- Mark daily_completed = FALSE for today only (no streak change)
            UPDATE public.patient_streak
            SET daily_completed = FALSE,
                updated_at      = NOW()
            WHERE patient_id = v_pid
              AND last_completed_date = v_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. GRANT
GRANT EXECUTE ON FUNCTION public.increment_cumulative_streak(INTEGER, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_daily_completion_and_streak() TO service_role;

-- NOTE: The existing triggers on diet_plan, activity_sessions, daily_sleep,
-- daily_water, daily_stress still point to update_daily_completion_and_streak()
-- which now uses cumulative logic — no trigger re-attachment needed.
