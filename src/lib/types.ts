import type { Database } from '@/integrations/supabase/types';

export type Scene = Database['public']['Tables']['scenes']['Row'];
export type SceneInsert = Database['public']['Tables']['scenes']['Insert'];
export type Segment = Database['public']['Tables']['segments']['Row'];
export type SegmentInsert = Database['public']['Tables']['segments']['Insert'];
export type SegmentUpdate = Database['public']['Tables']['segments']['Update'];

export interface SegmentPosition {
  zone: number;
  slice: number;
}
