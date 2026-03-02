-- ==========================================
-- 063_start_date_timestamp_precision.sql
-- Change transformation_start_date to TIMESTAMPTZ
-- ==========================================

ALTER TABLE public.patient_details 
ALTER COLUMN transformation_start_date SET DATA TYPE TIMESTAMPTZ USING transformation_start_date::TIMESTAMPTZ;

COMMENT ON COLUMN public.patient_details.transformation_start_date IS 'Exact timestamp when the user started their 12-week transformation plan';
