-- ============================================================
-- 060_add_breathing_sessions_to_daily_stress.sql
-- Add breathing_sessions column to daily_stress table
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.daily_stress
  ADD COLUMN IF NOT EXISTS breathing_sessions INT NOT NULL DEFAULT 0;
