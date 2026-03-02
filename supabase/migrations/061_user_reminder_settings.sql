-- ============================================================
-- 061_user_reminder_settings.sql
-- User-configurable reminder settings per health section
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_reminder_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id  TEXT,
  section           TEXT NOT NULL CHECK (section IN ('diet','exercise','water','mental','sleep')),
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  repeat_type       TEXT NOT NULL DEFAULT 'daily' CHECK (repeat_type IN ('daily','weekly','custom')),
  custom_days       TEXT[],                     -- ['mon','wed','fri']
  start_time        TIME,                        -- wall-clock start (HH:MM)
  end_time          TIME,                        -- wall-clock end
  specific_times    TIME[],                      -- for diet meal slots
  frequency_minutes INT,                         -- water interval (60,120,180)
  timezone          TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_reminder_user_section
    UNIQUE NULLS NOT DISTINCT (user_id, guest_session_id, section)
);

-- RLS
ALTER TABLE public.user_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reminder settings" ON public.user_reminder_settings;
CREATE POLICY "Users manage own reminder settings"
  ON public.user_reminder_settings FOR ALL
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND guest_session_id IS NOT NULL)
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_reminder_settings_updated_at ON public.user_reminder_settings;
CREATE TRIGGER trg_reminder_settings_updated_at
  BEFORE UPDATE ON public.user_reminder_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_reminder_settings_user
  ON public.user_reminder_settings (user_id, section);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_guest
  ON public.user_reminder_settings (guest_session_id, section);

-- ── Default seeder function ───────────────────────────────────────────────────
-- Called once per new user to create sensible defaults
CREATE OR REPLACE FUNCTION public.seed_default_reminders(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_reminder_settings
    (user_id, section, is_enabled, repeat_type, start_time, end_time, specific_times, frequency_minutes)
  VALUES
    (p_user_id, 'diet',     TRUE, 'daily', '18:00', '19:00',
      ARRAY['09:00','13:00','16:00','20:00']::TIME[], NULL),
    (p_user_id, 'exercise', TRUE, 'daily', '18:30', '19:30', NULL, NULL),
    (p_user_id, 'water',    TRUE, 'daily', '06:00', '22:00', NULL,  120),
    (p_user_id, 'mental',   TRUE, 'daily', '20:00', '20:00', NULL, NULL),
    (p_user_id, 'sleep',    TRUE, 'daily', '22:00', '22:00', NULL, NULL)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_reminders(UUID) TO authenticated;
