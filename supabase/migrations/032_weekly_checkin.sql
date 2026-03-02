-- ==========================================
-- 032_weekly_checkin.sql
-- Weekly Biometric Check-in Support
-- ==========================================

-- 1. Extend patient_details for Biometrics
ALTER TABLE public.patient_details 
ADD COLUMN IF NOT EXISTS last_weekly_checkin DATE,
ADD COLUMN IF NOT EXISTS blood_sugar TEXT,
ADD COLUMN IF NOT EXISTS thyroid_status TEXT;

-- 2. Add Comment for clarity
COMMENT ON COLUMN public.patient_details.blood_sugar IS 'Last recorded blood sugar level (e.g., Fasting/PP or numeric)';
COMMENT ON COLUMN public.patient_details.thyroid_status IS 'Last recorded thyroid status (e.g., Normal, Hypo, Hyper)';
