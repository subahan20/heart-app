-- ==========================================
-- 036_relax_profile_constraints.sql
-- Relax constraints to allow streak updates for incomplete profiles
-- ==========================================

-- 1. Make full_name nullable to avoid 23502 errors during early streak updates
ALTER TABLE public.patient_details ALTER COLUMN full_name DROP NOT NULL;

-- 2. Add an index to help with unified streak checks if not already efficient
CREATE INDEX IF NOT EXISTS idx_patient_details_streak_lookup 
ON public.patient_details (user_id, guest_session_id, last_streak_date);
