
CREATE TABLE public.scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  location_name text,
  date_label text,
  time_of_day text,
  weather text,
  season text,
  camera_height_cm integer DEFAULT 160,
  blind_zone_desc text DEFAULT 'Dark interior of a wooden cabin doorway. Camera positioned exactly at the threshold. Natural wood grain visible on door frame edges. No light source inside.',
  style_preset text DEFAULT 'photorealistic',
  notes text
);

CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid REFERENCES public.scenes(id) ON DELETE CASCADE NOT NULL,
  zone integer NOT NULL CHECK (zone BETWEEN 1 AND 4),
  slice integer NOT NULL CHECK (slice BETWEEN 1 AND 3),
  content_desc text,
  extra_notes text,
  generated_prompt text,
  image_url text,
  status text DEFAULT 'empty' CHECK (status IN ('empty','described','prompted','generated')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(scene_id, zone, slice)
);

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to scenes" ON public.scenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to segments" ON public.segments FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
