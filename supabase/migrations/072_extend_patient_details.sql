-- ==========================================
-- 072_extend_patient_details.sql
-- Add missing columns for Onboarding and Profile
-- ==========================================

ALTER TABLE public.patient_details 
ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS bmi_status TEXT,
ADD COLUMN IF NOT EXISTS blood_sugar INTEGER,
ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS stress_level INTEGER;

COMMENT ON COLUMN public.patient_details.bmi IS 'Calculated Body Mass Index';
COMMENT ON COLUMN public.patient_details.bmi_status IS 'BMI Category (Underweight, Normal, Overweight, Obese)';
COMMENT ON COLUMN public.patient_details.blood_sugar IS 'Last recorded blood sugar level (mg/dL)';
COMMENT ON COLUMN public.patient_details.sleep_hours IS 'Average sleep duration per night';
COMMENT ON COLUMN public.patient_details.stress_level IS 'Self-reported stress level (1-5)';

-- Refresh the schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
