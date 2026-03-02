-- ==========================================
-- 002_patient_details.sql
-- Unified Profile and Streak Tracking
-- ==========================================

CREATE TABLE IF NOT EXISTS public.patient_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    full_name TEXT,
    age INTEGER,
    gender TEXT,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    activity_level TEXT,
    diseases TEXT[] DEFAULT '{}',
    streak_count INTEGER DEFAULT 0,
    last_streak_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT patient_details_user_id_key UNIQUE (user_id),
    CONSTRAINT patient_details_guest_session_id_key UNIQUE (guest_session_id)
);

-- Triggers
DROP TRIGGER IF EXISTS update_patient_details_updated_at ON public.patient_details;
CREATE TRIGGER update_patient_details_updated_at 
    BEFORE UPDATE ON public.patient_details 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indices
CREATE INDEX IF NOT EXISTS idx_patient_details_user_id ON public.patient_details(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_details_guest_session_id ON public.patient_details(guest_session_id);

-- RLS
ALTER TABLE public.patient_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and Guests can manage own data" ON public.patient_details;
CREATE POLICY "Users and Guests can manage own data" 
    ON public.patient_details FOR ALL 
    USING (auth.uid() = user_id OR guest_session_id IS NOT NULL);
