-- Migration: 044_relax_profile_constraints_comprehensive.sql
-- Description: Relax NOT NULL constraints on all profile fields to allow partial updates during check-ins

ALTER TABLE public.patient_details 
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN age DROP NOT NULL,
ALTER COLUMN gender DROP NOT NULL,
ALTER COLUMN height DROP NOT NULL,
ALTER COLUMN weight DROP NOT NULL,
ALTER COLUMN activity_level DROP NOT NULL;
