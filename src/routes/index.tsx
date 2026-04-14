import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchScenes, deleteScene } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MapPin, Cloud, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: '360° VR Scene Prompt Builder' },
      { name: 'description', content: 'Cinematic 360° panoramic scene prompt builder for AI image generation' },
    ],
  }),
  component: SceneListPage,
});

function SceneListPage() {
  const queryClient = useQueryClient();
  const { data: scenes, isLoading } = useQuery({
    queryKey: ['scenes'],
    queryFn: fetchScenes,
  });

  // Fetch segment counts
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!scenes?.length) return;
    const fetchCounts = async () => {
      const results: Record<string, number> = {};
      for (const scene of scenes) {
        const { count } = await supabase
          .from('segments')
          .select('*', { count: 'exact', head: true })
          .eq('scene_id', scene.id)
          .neq('status', 'empty');
        results[scene.id] = count ?? 0;
      }
      setCounts(results);
    };
    fetchCounts();
  }, [scenes]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bu sahneyi silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteScene(id);
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
      toast.success('Sahne silindi');
    } catch {
      toast.error('Silme hatası');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">360° VR Sahneler</h1>
            <p className="mt-1 text-sm text-muted-foreground">Panoramik sahne prompt oluşturucu</p>
          </div>
          <Link
            to="/scene/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Yeni Sahne
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : scenes?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="mb-4 text-lg text-muted-foreground">Henüz sahne yok</p>
            <Link
              to="/scene/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> İlk sahnenizi oluşturun
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenes?.map(scene => (
              <Link
                key={scene.id}
                to="/scene/$id"
                params={{ id: scene.id }}
                className="group relative rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-card/80"
              >
                <button
                  onClick={(e) => handleDelete(scene.id, e)}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <h3 className="mb-3 text-lg font-semibold text-foreground">{scene.title}</h3>
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  {scene.location_name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {scene.location_name}
                    </span>
                  )}
                  {scene.weather && (
                    <span className="flex items-center gap-1.5">
                      <Cloud className="h-3 w-3" /> {scene.weather} · {scene.time_of_day}
                    </span>
                  )}
                  {scene.date_label && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> {scene.date_label}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {counts[scene.id] ?? 0}/12 segment
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {scene.style_preset}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((counts[scene.id] ?? 0) / 12) * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
