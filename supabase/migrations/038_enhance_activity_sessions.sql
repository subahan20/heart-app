-- ==========================================
-- 038_enhance_activity_sessions.sql
-- COMPLETE OMNIBUS: SCHEMA + FUNCTIONS
-- ==========================================

-- 1. ENHANCE TABLE SCHEMA
-- Add missing columns if they don't exist
ALTER TABLE public.activity_sessions 
ADD COLUMN IF NOT EXISTS exercise_name TEXT,
ADD COLUMN IF NOT EXISTS calories_burned INTEGER,
ADD COLUMN IF NOT EXISTS intensity TEXT DEFAULT 'moderate';

-- 2. CLEANUP OLD FUNCTION SIGNATURES
-- This prevents "function not found" and "ambiguous" errors in the schema cache
DROP FUNCTION IF EXISTS public.start_activity_session(varchar, integer, uuid, text);
DROP FUNCTION IF EXISTS public.start_activity_session(varchar, integer, uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS public.start_activity_session(text, integer, uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS public.start_activity_session(text, numeric, text, text, text, text, numeric);
DROP FUNCTION IF EXISTS public.start_activity_session(text, numeric, uuid, text, text, text, numeric);
DROP FUNCTION IF EXISTS public.start_activity_session(text, integer, uuid, text, text, text, integer);

-- 3. CREATE THE FINAL ULTRA-ROBUST START FUNCTION
-- Drop old signatures first to avoid "cannot remove parameter defaults" error
DROP FUNCTION IF EXISTS public.start_activity_session(varchar, integer, uuid, text);
DROP FUNCTION IF EXISTS public.start_activity_session(varchar, integer, uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS public.start_activity_session(text, integer, uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS public.start_activity_session(text, numeric, text, text, text, text, numeric);
DROP FUNCTION IF EXISTS public.complete_activity_session(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.start_activity_session(
    p_activity_type TEXT,
    p_duration_seconds NUMERIC,
    p_user_id TEXT DEFAULT NULL,
    p_guest_session_id TEXT DEFAULT NULL,
    p_exercise_name TEXT DEFAULT NULL,
    p_intensity TEXT DEFAULT 'moderate',
    p_calories_burned NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_user_id UUID;
BEGIN
    -- Safely handle UUID conversion
    IF p_user_id IS NOT NULL AND p_user_id <> '' THEN
        BEGIN
            v_user_id := p_user_id::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            -- p_user_id is not a valid UUID (e.g. guest session string), treat as null
            v_user_id := NULL;
        END;
    END IF;

    INSERT INTO public.activity_sessions (
        user_id, 
        guest_session_id, 
        activity_type, 
        duration_seconds,
        exercise_name,
        intensity,
        calories_burned
    ) VALUES (
        v_user_id,
        p_guest_session_id,
        p_activity_type,
        p_duration_seconds::INTEGER,
        p_exercise_name,
        p_intensity,
        p_calories_burned::INTEGER
    ) RETURNING id INTO v_session_id;
    
    RETURN QUERY SELECT TRUE, 'Session started successfully'::TEXT, v_session_id;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT, NULL::UUID;
END;
$$;

-- 4. CREATE THE ROBUST COMPLETE FUNCTION
CREATE OR REPLACE FUNCTION public.complete_activity_session(
    p_session_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_guest_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_current_time TIMESTAMP WITH TIME ZONE := NOW();
    v_elapsed_seconds INTEGER;
BEGIN
    SELECT * INTO v_session FROM public.activity_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, NULL::UUID; RETURN; END IF;
    IF v_session.completed THEN RETURN QUERY SELECT FALSE, 'Session already completed'::TEXT, v_session.id; RETURN; END IF;
    
    v_elapsed_seconds := EXTRACT(EPOCH FROM (v_current_time - v_session.start_time));
    
    UPDATE public.activity_sessions SET 
        completed = TRUE,
        completed_at = v_current_time,
        actual_duration_seconds = v_elapsed_seconds,
        updated_at = v_current_time
    WHERE id = p_session_id;
    
    RETURN QUERY SELECT TRUE, 'Session completed successfully'::TEXT, v_session.id;
END;
$$;

-- 5. RESTORE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.start_activity_session TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_activity_session TO authenticated, anon;
