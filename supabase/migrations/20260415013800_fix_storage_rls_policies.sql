-- Fix storage RLS policies that fail due to nested RLS evaluation.
-- The previous storage policies used subqueries on public.scenes (which has its
-- own RLS enabled). When Supabase Storage performs an upsert (INSERT ON CONFLICT
-- DO UPDATE), the nested RLS evaluation can cause "row violates row-level
-- security policy" errors.
--
-- The fix: create a SECURITY DEFINER helper function that checks scene ownership
-- without being subject to RLS on the scenes table, then update storage policies
-- to use it.

-- Helper function: returns TRUE if the given scene_id belongs to the given user.
-- Runs as the function owner (SECURITY DEFINER) so it bypasses RLS on scenes.
CREATE OR REPLACE FUNCTION public.user_owns_scene(p_scene_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scenes WHERE id::text = p_scene_id AND user_id = p_user_id
  );
$$;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload scene images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view scene images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own scene images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own scene images" ON storage.objects;

-- Recreate storage policies using the helper function (avoids nested RLS)
CREATE POLICY "Anyone can view scene images" ON storage.objects
  FOR SELECT USING (bucket_id = 'scenes');

CREATE POLICY "Authenticated users can upload scene images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scenes'
    AND public.user_owns_scene((storage.foldername(name))[1], auth.uid())
  );

CREATE POLICY "Users can update own scene images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'scenes'
    AND public.user_owns_scene((storage.foldername(name))[1], auth.uid())
  )
  WITH CHECK (
    bucket_id = 'scenes'
    AND public.user_owns_scene((storage.foldername(name))[1], auth.uid())
  );

CREATE POLICY "Users can delete own scene images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'scenes'
    AND public.user_owns_scene((storage.foldername(name))[1], auth.uid())
  );
