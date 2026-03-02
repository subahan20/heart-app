-- ==========================================
-- 037_cleanup_notification_indexes.sql
-- Consolidate notification unique constraints to prevent 23505 errors
-- ==========================================

-- 1. Drop all known overlapping indexes
DROP INDEX IF EXISTS public.idx_notifications_upsert_unique;
DROP INDEX IF EXISTS public.idx_notifications_granular_unique_guest;
DROP INDEX IF EXISTS public.idx_notifications_unified_upsert;

-- 2. Create the single, authoritative unique index
-- This uses NULLS NOT DISTINCT (PG 15+) to treat NULL the same as other values
CREATE UNIQUE INDEX idx_notifications_unified_upsert 
ON public.notifications (user_id, guest_session_id, date, category, type) 
NULLS NOT DISTINCT;

-- 3. Add a check to ensure we don't have both user_id and guest_session_id (optional but recommended)
-- ALTER TABLE public.notifications ADD CONSTRAINT check_only_one_identity 
-- CHECK ((user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL));
