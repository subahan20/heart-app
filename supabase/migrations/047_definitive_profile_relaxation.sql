-- Migration: 047_definitive_profile_relaxation.sql
-- Description: Drop NOT NULL constraints on all patient_details profile fields to prevent upsert failures

ALTER TABLE public.patient_details 
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN age DROP NOT NULL,
ALTER COLUMN gender DROP NOT NULL,
ALTER COLUMN height DROP NOT NULL,
ALTER COLUMN weight DROP NOT NULL,
ALTER COLUMN activity_level DROP NOT NULL,
ALTER COLUMN diseases DROP NOT NULL;

-- Also ensure blood_sugar and thyroid_status are nullable (they should be already)
ALTER TABLE public.patient_details 
ALTER COLUMN blood_sugar DROP NOT NULL,
ALTER COLUMN thyroid_status DROP NOT NULL;

-- Remove any remaining restrictive check constraints that might be causing issues
-- (Optional: only if we find specific ones later, but for now NOT NULL is the culprit)
