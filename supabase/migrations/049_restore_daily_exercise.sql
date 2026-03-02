-- ==========================================
-- 049_restore_daily_exercise.sql
-- Restoring the missing daily_exercise table
-- ==========================================

-- Daily Exercise Table
CREATE TABLE IF NOT EXISTS public.daily_exercise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    date DATE NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_minutes INTEGER DEFAULT 0,
    total_calories INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraints for upsert operations
    CONSTRAINT unique_exercise_user_date UNIQUE (user_id, date),
    CONSTRAINT unique_exercise_guest_date UNIQUE (guest_session_id, date)
);

-- RLS
ALTER TABLE public.daily_exercise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily exercises" ON public.daily_exercise;
CREATE POLICY "Users can manage own daily exercises" ON public.daily_exercise 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own daily exercises" ON public.daily_exercise;
CREATE POLICY "Guests can manage own daily exercises" ON public.daily_exercise 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Updated At Trigger
DROP TRIGGER IF EXISTS update_daily_exercise_updated_at ON public.daily_exercise;
CREATE TRIGGER update_daily_exercise_updated_at 
    BEFORE UPDATE ON public.daily_exercise 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_exercise_user_date ON public.daily_exercise(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_exercise_guest_date ON public.daily_exercise(guest_session_id, date);
