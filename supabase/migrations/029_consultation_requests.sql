-- Create consultation_requests table
CREATE TABLE IF NOT EXISTS public.consultation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    guest_session_id TEXT,
    name TEXT NOT NULL,
    age INTEGER,
    phone TEXT NOT NULL,
    regarding TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

-- Policies for insertion
CREATE POLICY "Allow authenticated users to insert their own requests" 
ON public.consultation_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow guest users to insert requests" 
ON public.consultation_requests 
FOR INSERT 
WITH CHECK (user_id IS NULL AND guest_session_id IS NOT NULL);

-- Policy for viewing (only by authenticated user for their own data, or by admins if roles exist)
CREATE POLICY "Users can view their own requests" 
ON public.consultation_requests 
FOR SELECT 
USING (auth.uid() = user_id OR guest_session_id = (SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'guest_session_id', '')));

-- Note: In a real app, you would probably want an admin role to see all requests.
