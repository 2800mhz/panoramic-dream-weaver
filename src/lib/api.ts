import { supabase } from '@/integrations/supabase/client';
import type { Scene, SceneInsert, Segment, SegmentUpdate } from '@/lib/types';

export async function fetchScenes(): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchScene(id: string): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createScene(scene: SceneInsert): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .insert(scene)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateScene(id: string, scene: Partial<SceneInsert>): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .update(scene)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteScene(id: string): Promise<void> {
  const { error } = await supabase.from('scenes').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSegments(sceneId: string): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('scene_id', sceneId)
    .order('zone')
    .order('slice');
  if (error) throw error;
  return data;
}

export async function upsertSegment(segment: {
  scene_id: string;
  zone: number;
  slice: number;
  content_desc?: string | null;
  extra_notes?: string | null;
  generated_prompt?: string | null;
  status?: string;
}): Promise<Segment> {
  const { data, error } = await supabase
    .from('segments')
    .upsert(segment, { onConflict: 'scene_id,zone,slice' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchSceneSegmentCount(sceneId: string): Promise<number> {
  const { count, error } = await supabase
    .from('segments')
    .select('*', { count: 'exact', head: true })
    .eq('scene_id', sceneId)
    .neq('status', 'empty');
  if (error) throw error;
  return count ?? 0;
}
