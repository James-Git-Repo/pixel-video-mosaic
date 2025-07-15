
-- Create table for paid video submissions
CREATE TABLE public.video_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  slots JSONB NOT NULL, -- Array of slot coordinates like ["100-200", "101-200"]
  amount_paid INTEGER NOT NULL, -- Amount in cents ($2 = 200 cents per slot)
  payment_intent_id TEXT UNIQUE NOT NULL,
  video_url TEXT,
  video_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- Create table to track occupied slots
CREATE TABLE public.occupied_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT NOT NULL UNIQUE, -- Format: "row-column" like "100-200"
  video_url TEXT NOT NULL,
  submission_id UUID REFERENCES public.video_submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for admin video management
CREATE TABLE public.admin_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT NOT NULL UNIQUE,
  video_url TEXT NOT NULL,
  uploaded_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.video_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupied_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_videos ENABLE ROW LEVEL SECURITY;

-- Policies for video_submissions (public read for admins, insert for users)
CREATE POLICY "Anyone can create submissions" ON public.video_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view submissions" ON public.video_submissions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update submissions" ON public.video_submissions
  FOR UPDATE USING (true);

-- Policies for occupied_slots (public read)
CREATE POLICY "Anyone can view occupied slots" ON public.occupied_slots
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert occupied slots" ON public.occupied_slots
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update occupied slots" ON public.occupied_slots
  FOR UPDATE USING (true);

-- Policies for admin_videos (public read)
CREATE POLICY "Anyone can view admin videos" ON public.admin_videos
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert admin videos" ON public.admin_videos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update admin videos" ON public.admin_videos
  FOR UPDATE USING (true);

-- Create storage bucket for user video uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-videos', 'user-videos', true);

-- Create policy for user video uploads
CREATE POLICY "Anyone can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-videos');

CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-videos');

CREATE POLICY "Anyone can update videos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'user-videos');
