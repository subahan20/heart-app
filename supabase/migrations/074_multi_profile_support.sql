-- ==========================================
-- 074_multi_profile_support.sql
-- Relax constraints to allow multiple health profiles
-- ==========================================

-- 1. Remove the "One Profile Per User" limit
ALTER TABLE public.patient_details 
DROP CONSTRAINT IF EXISTS patient_details_user_id_key;

-- 2. Remove the "One Profile Per Guest" limit
ALTER TABLE public.patient_details 
DROP CONSTRAINT IF EXISTS patient_details_guest_session_id_key;

-- 3. Add a primary flag (useful for default profile selection)
ALTER TABLE public.patient_details 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- 4. Unique Constraint on Name per User (Optional, prevents accidental duplicates for same person)
-- ALTER TABLE public.patient_details ADD CONSTRAINT unique_profile_name_per_user UNIQUE (user_id, full_name);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
