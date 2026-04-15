-- Add video motion parameters to segments table for 360° video generation
ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS motion_type text DEFAULT 'static'
  CHECK (motion_type IN ('static', 'slow_pan', 'orbit', 'zoom_in', 'zoom_out', 'tracking', 'dolly', 'crane'));

ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS camera_speed text DEFAULT 'slow'
  CHECK (camera_speed IN ('very_slow', 'slow', 'medium', 'fast', 'very_fast'));

ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS lighting_direction text DEFAULT 'natural'
  CHECK (lighting_direction IN ('natural', 'north', 'south', 'east', 'west', 'overhead', 'backlit', 'side_lit', 'ambient'));
