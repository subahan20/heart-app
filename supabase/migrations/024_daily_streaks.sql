-- ==========================================
-- 024_daily_streaks.sql
-- Tracking individual daily completions for history and streaks
-- ==========================================

CREATE TABLE IF NOT EXISTS public.daily_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    streak_count INTEGER DEFAULT 0,
    activities_completed JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.daily_streaks;
CREATE POLICY "Users and Guests can manage own data" 
    ON public.daily_streaks FOR ALL 
    USING (
        (auth.uid() = user_id) OR 
        (guest_session_id IS NOT NULL AND guest_session_id = current_setting('app.guest_session_id', true))
    );

-- Indices
CREATE INDEX IF NOT EXISTS idx_daily_streaks_user_id ON public.daily_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_guest_id ON public.daily_streaks(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_date ON public.daily_streaks(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_streaks_upsert_unique ON public.daily_streaks (
    user_id, 
    guest_session_id, 
    date
) NULLS NOT DISTINCT;
