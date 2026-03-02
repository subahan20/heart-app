-- Add BP columns to patient_details
ALTER TABLE public.patient_details 
ADD COLUMN IF NOT EXISTS systolic INTEGER,
ADD COLUMN IF NOT EXISTS diastolic INTEGER,
ADD COLUMN IF NOT EXISTS pulse INTEGER;

COMMENT ON COLUMN public.patient_details.systolic IS 'Last recorded systolic blood pressure';
COMMENT ON COLUMN public.patient_details.diastolic IS 'Last recorded diastolic blood pressure';
COMMENT ON COLUMN public.patient_details.pulse IS 'Last recorded pulse rate (bpm)';
