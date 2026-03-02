-- ==========================================
-- 057_bmi_records_table.sql
-- BMI Records Storage
-- Stores all BMI calculations with original units and derived results.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.bmi_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    age             INTEGER NOT NULL CHECK (age BETWEEN 1 AND 120),
    gender          TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    -- Original inputs (preserved as entered by the user)
    height_value    FLOAT NOT NULL CHECK (height_value > 0),
    height_unit     TEXT NOT NULL CHECK (height_unit IN ('cm', 'm', 'inches', 'ft_in')),
    weight_value    FLOAT NOT NULL CHECK (weight_value > 0),
    weight_unit     TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lbs')),
    -- For US feet+inches mode (height_unit = 'ft_in')
    height_feet     INTEGER,
    height_inches   FLOAT,
    -- Results
    calculated_bmi  FLOAT NOT NULL,
    bmi_category    TEXT NOT NULL CHECK (bmi_category IN ('Underweight', 'Normal', 'Overweight', 'Obese')),
    unit_system     TEXT NOT NULL CHECK (unit_system IN ('us', 'metric', 'other')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bmi_records_user_id
    ON public.bmi_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bmi_records_guest
    ON public.bmi_records(guest_session_id, created_at DESC);

-- RLS
ALTER TABLE public.bmi_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bmi_records" ON public.bmi_records;
CREATE POLICY "Users can manage own bmi_records"
    ON public.bmi_records FOR ALL
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
