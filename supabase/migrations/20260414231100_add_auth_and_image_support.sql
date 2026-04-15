-- Add user_id and image_url columns to scenes table
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS image_url text;

-- Drop existing open policies
DROP POLICY IF EXISTS "Allow all access to scenes" ON public.scenes;
DROP POLICY IF EXISTS "Allow all access to segments" ON public.segments;

-- RLS policies for scenes: users can only access their own scenes
CREATE POLICY "Users can view own scenes" ON public.scenes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scenes" ON public.scenes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenes" ON public.scenes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenes" ON public.scenes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for segments: access through scene ownership
CREATE POLICY "Users can view own segments" ON public.segments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scenes WHERE scenes.id = segments.scene_id AND scenes.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own segments" ON public.segments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.scenes WHERE scenes.id = segments.scene_id AND scenes.user_id = auth.uid())
  );

CREATE POLICY "Users can update own segments" ON public.segments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.scenes WHERE scenes.id = segments.scene_id AND scenes.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scenes WHERE scenes.id = segments.scene_id AND scenes.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own segments" ON public.segments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.scenes WHERE scenes.id = segments.scene_id AND scenes.user_id = auth.uid())
  );

-- Create storage bucket for scene images (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scenes', 'scenes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for scenes bucket
CREATE POLICY "Authenticated users can upload scene images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scenes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.scenes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view scene images" ON storage.objects
  FOR SELECT USING (bucket_id = 'scenes');

CREATE POLICY "Users can update own scene images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'scenes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.scenes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'scenes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.scenes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scene images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'scenes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.scenes WHERE user_id = auth.uid()
    )
  );
