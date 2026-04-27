-- ==========================================
-- 078_relax_patient_details_constraints.sql
-- Relax NOT NULL constraints for flexible profile creation
-- ==========================================

ALTER TABLE public.patient_details 
ALTER COLUMN activity_level DROP NOT NULL,
ALTER COLUMN age DROP NOT NULL,
ALTER COLUMN gender DROP NOT NULL,
ALTER COLUMN height DROP NOT NULL,
ALTER COLUMN weight DROP NOT NULL;

-- Ensure defaults for essential fields if missing
ALTER TABLE public.patient_details 
ALTER COLUMN diseases SET DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
