-- Migration: 043_relax_age_constraint.sql
-- Description: Relax NOT NULL constraint on age in patient_details to allow partial profile updates

ALTER TABLE public.patient_details ALTER COLUMN age DROP NOT NULL;
