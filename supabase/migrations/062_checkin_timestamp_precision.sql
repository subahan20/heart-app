-- ==========================================
-- 062_checkin_timestamp_precision.sql
-- Change last_weekly_checkin to TIMESTAMPTZ
-- ==========================================

ALTER TABLE public.patient_details 
ALTER COLUMN last_weekly_checkin SET DATA TYPE TIMESTAMPTZ USING last_weekly_checkin::TIMESTAMPTZ;

COMMENT ON COLUMN public.patient_details.last_weekly_checkin IS 'Exact timestamp of the last weekly health check-in completion';
