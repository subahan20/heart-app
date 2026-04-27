-- ==========================================
-- 066_add_fcm_token.sql
-- Add FCM token support for push notifications
-- ==========================================

ALTER TABLE public.patient_details
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_details_fcm_token ON public.patient_details(fcm_token);
