-- ============================================================
-- 059_breathing_rounds_column.sql
-- Add breathing_rounds_completed to daily_tracking
-- ============================================================

ALTER TABLE public.daily_tracking
  ADD COLUMN IF NOT EXISTS breathing_rounds_completed INT NOT NULL DEFAULT 0;

-- ── Atomic increment RPC (prevents race conditions / double-click) ──────────
CREATE OR REPLACE FUNCTION public.increment_breathing_round(
  p_user_id UUID,
  p_date    DATE
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current INT;
  v_new     INT;
BEGIN
  SELECT breathing_rounds_completed INTO v_current
  FROM public.daily_tracking
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF v_current IS NULL THEN
    -- Row doesn't exist yet: insert with 1
    INSERT INTO public.daily_tracking (user_id, date, breathing_rounds_completed)
    VALUES (p_user_id, p_date, 1)
    ON CONFLICT (user_id, guest_session_id, date) DO UPDATE
      SET breathing_rounds_completed = public.daily_tracking.breathing_rounds_completed + 1;

    RETURN 1;
  END IF;

  -- Already at max (5) → no-op
  IF v_current >= 5 THEN
    RETURN v_current;
  END IF;

  v_new := v_current + 1;

  UPDATE public.daily_tracking
  SET
    breathing_rounds_completed = v_new,
    mental_completed = CASE WHEN v_new >= 5 THEN TRUE ELSE mental_completed END
  WHERE user_id = p_user_id AND date = p_date;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_breathing_round(UUID, DATE) TO service_role, authenticated;
