-- Migration: Create feature_persistence table
-- Description: Stores feature states (timers, schedules, etc.) persistently in the database.

-- Create the table
CREATE TABLE IF NOT EXISTS public.feature_persistence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id TEXT,
    feature_key TEXT NOT NULL,
    state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure either user_id or guest_session_id is present
    CONSTRAINT user_or_guest_check CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
    
    -- unique constraint per feature per user/guest
    UNIQUE (user_id, feature_key),
    UNIQUE (guest_session_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.feature_persistence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own feature states"
    ON public.feature_persistence
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Guests can manage their own feature states"
    ON public.feature_persistence
    FOR ALL
    USING (auth.role() = 'anon' AND guest_session_id IS NOT NULL);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_feature_persistence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_persistence_at
    BEFORE UPDATE ON public.feature_persistence
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_persistence_timestamp();

-- Grant access
GRANT ALL ON public.feature_persistence TO authenticated;
GRANT ALL ON public.feature_persistence TO anon;
GRANT ALL ON public.feature_persistence TO service_role;
