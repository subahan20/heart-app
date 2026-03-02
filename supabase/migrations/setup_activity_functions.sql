-- ==========================================
-- Setup Activity Sessions Functions
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- First, create the activity_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    activity_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activity_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage own activity sessions" ON public.activity_sessions;
CREATE POLICY "Users can manage own activity sessions" ON public.activity_sessions 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guests can manage own activity sessions" ON public.activity_sessions;
CREATE POLICY "Guests can manage own activity sessions" ON public.activity_sessions 
    FOR ALL USING (guest_session_id IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_id ON public.activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_guest_session_id ON public.activity_sessions(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_start_time ON public.activity_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_completed ON public.activity_sessions(completed);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_completed ON public.activity_sessions(user_id, completed);

-- Create or replace the start_activity_session function
CREATE OR REPLACE FUNCTION public.start_activity_session(
    p_activity_type VARCHAR(50),
    p_duration_seconds INTEGER,
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
    v_session_id UUID;
    v_guest_id TEXT;
BEGIN
    -- Validate inputs
    IF p_activity_type IS NULL OR p_activity_type = '' THEN
        RETURN QUERY SELECT FALSE, 'Activity type is required'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF p_duration_seconds IS NULL OR p_duration_seconds <= 0 THEN
        RETURN QUERY SELECT FALSE, 'Duration must be greater than 0'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Handle guest users - generate guest session ID if not provided
    IF p_user_id IS NULL AND p_guest_session_id IS NULL THEN
        v_guest_id := 'guest_' || gen_random_uuid()::TEXT;
        p_guest_session_id := v_guest_id;
    END IF;
    
    -- Insert new session
    INSERT INTO public.activity_sessions (
        user_id, 
        guest_session_id, 
        activity_type, 
        duration_seconds
    ) VALUES (
        p_user_id,
        p_guest_session_id,
        p_activity_type,
        p_duration_seconds
    ) RETURNING id INTO v_session_id;
    
    RETURN QUERY SELECT TRUE, 'Session started successfully'::TEXT, v_session_id;
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM::TEXT, NULL::UUID;
        RETURN;
END;
$$;

-- Create or replace the complete_activity_session function
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
    -- Get the session record
    SELECT * INTO v_session 
    FROM public.activity_sessions 
    WHERE id = p_session_id;
    
    -- Check if session exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Verify ownership (allow both authenticated users and guests)
    IF p_user_id IS NOT NULL THEN
        IF v_session.user_id IS NULL OR v_session.user_id != p_user_id THEN
            RETURN QUERY SELECT FALSE, 'Access denied'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    ELSIF p_guest_session_id IS NOT NULL THEN
        IF v_session.guest_session_id IS NULL OR v_session.guest_session_id != p_guest_session_id THEN
            RETURN QUERY SELECT FALSE, 'Access denied'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    ELSE
        -- If neither user_id nor guest_session_id provided, try to match by guest session pattern
        IF v_session.guest_session_id IS NOT NULL AND v_session.guest_session_id LIKE 'guest_%' THEN
            -- Allow completion for guest sessions without explicit ID
            NULL;
        ELSE
            RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;
    
    -- Check if already completed
    IF v_session.completed THEN
        RETURN QUERY SELECT FALSE, 'Session already completed'::TEXT, v_session.id;
        RETURN;
    END IF;
    
    -- Calculate elapsed time
    v_elapsed_seconds := EXTRACT(EPOCH FROM (v_current_time - v_session.start_time));
    
    -- Validate duration - allow completion if timer is finished or very close to finishing
    -- Add 2-second buffer to handle timing precision issues
    IF v_elapsed_seconds < (v_session.duration_seconds - 2) THEN
        RETURN QUERY SELECT FALSE, 
            FORMAT('Timer not completed yet. %s seconds remaining', 
                   CEIL(GREATEST(0, v_session.duration_seconds - v_elapsed_seconds))::TEXT, 
            v_session.id);
        RETURN;
    END IF;
    
    -- Allow completion if timer is 98% complete or more
    IF v_elapsed_seconds >= (v_session.duration_seconds * 0.98) THEN
        NULL;  -- Continue to completion
    ELSE
        -- Only reject if significantly under target
        RETURN QUERY SELECT FALSE, 
            FORMAT('Timer not completed yet. %s seconds remaining', 
                   CEIL(v_session.duration_seconds - v_elapsed_seconds)::TEXT, 
            v_session.id);
        RETURN;
    END IF;
    
    -- Mark as completed
    UPDATE public.activity_sessions 
    SET 
        completed = TRUE,
        completed_at = v_current_time,
        actual_duration_seconds = v_elapsed_seconds,
        updated_at = v_current_time
    WHERE id = p_session_id;
    
    RETURN QUERY SELECT TRUE, 'Session completed successfully'::TEXT, v_session.id;
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM::TEXT, NULL::UUID;
        RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.start_activity_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_activity_session TO anon;
GRANT EXECUTE ON FUNCTION public.complete_activity_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_activity_session TO anon;
