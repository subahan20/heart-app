-- ==========================================
-- 035_remove_transformation_program.sql
-- Remove 12-Week AI Transformation System
-- ==========================================

-- 1. Drop the Transformation Plans table
DROP TABLE IF EXISTS public.transformation_plans CASCADE;

-- 2. Remove columns from patient_details
ALTER TABLE public.patient_details 
DROP COLUMN IF EXISTS transformation_start_date,
DROP COLUMN IF EXISTS transformation_goal,
DROP COLUMN IF EXISTS transformation_badges;
