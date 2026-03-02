-- ==========================================
-- 053_add_water_goal_column.sql
-- FIX: Add missing goal_ml column to daily_water
-- ==========================================

-- 1. Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_water' 
        AND column_name = 'goal_ml'
    ) THEN
        ALTER TABLE public.daily_water ADD COLUMN goal_ml INTEGER DEFAULT 3000;
    END IF;
END $$;

-- 2. Backfill goal_ml from target_glasses if target_glasses exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_water' 
        AND column_name = 'target_glasses'
    ) THEN
        UPDATE public.daily_water 
        SET goal_ml = COALESCE(target_glasses * 250, 3000)
        WHERE goal_ml IS NULL OR goal_ml = 3000;
    END IF;
END $$;

-- 3. Ensure the completion logic uses goal_ml safely
-- (Already handled by 052_nuclear_streak_fix.sql but good to keep in mind)
