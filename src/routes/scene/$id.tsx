import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { fetchScene, fetchSegments, upsertSegment } from '@/lib/api';
import { generateSegmentPrompt, generateMasterPrompt } from '@/lib/prompt-generator';
import ZoneDiagram from '@/components/ZoneDiagram';
import SegmentPanel from '@/components/SegmentPanel';
import PromptPreview from '@/components/PromptPreview';
import type { SegmentPosition, Segment } from '@/lib/types';
import { ZONE_NAMES } from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Cloud, Calendar, Pencil } from 'lucide-react';

export const Route = createFileRoute('/scene/$id')({
  head: () => ({
    meta: [
      { title: 'Sahne Editörü — 360° VR Prompt Builder' },
    ],
  }),
  component: SceneEditorPage,
});

function SceneEditorPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedSegment, setSelectedSegment] = useState<SegmentPosition | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('');
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);

  const { data: scene, isLoading: sceneLoading } = useQuery({
    queryKey: ['scene', id],
    queryFn: () => fetchScene(id),
  });

  const { data: segments = [], isLoading: segmentsLoading } = useQuery({
    queryKey: ['segments', id],
    queryFn: () => fetchSegments(id),
  });

  const invalidateSegments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['segments', id] });
  }, [queryClient, id]);

  const handleGeneratePrompt = useCallback(async (segment: Segment) => {
    if (!scene) return;
    setIsGenerating(true);
    try {
      const prompt = await generateSegmentPrompt(scene, segments, segment);
      await upsertSegment({
        scene_id: id,
        zone: segment.zone,
        slice: segment.slice,
        content_desc: segment.content_desc,
        extra_notes: segment.extra_notes,
        generated_prompt: prompt,
        status: 'prompted',
      });
      toast.success('Prompt üretildi');
      invalidateSegments();
    } catch (err) {
      toast.error('Prompt üretme hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setIsGenerating(false);
    }
  }, [scene, segments, id, invalidateSegments]);

  const handleGenerateMaster = useCallback(async () => {
    if (!scene) return;
    const prompted = segments.filter(s => s.generated_prompt);
    if (prompted.length === 0) {
      toast.error('Önce en az bir segment promptu üretin');
      return;
    }
    setIsGeneratingMaster(true);
    try {
      const master = await generateMasterPrompt(scene, segments);
      setMasterPrompt(master);
      toast.success('Master prompt üretildi');
    } catch (err) {
      toast.error('Master prompt hatası');
    } finally {
      setIsGeneratingMaster(false);
    }
  }, [scene, segments]);

  if (sceneLoading || segmentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg text-muted-foreground">Sahne bulunamadı</p>
        <Link to="/" className="text-sm text-primary hover:underline">Ana sayfaya dön</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{scene.title}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {scene.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {scene.location_name}
                  </span>
                )}
                {scene.weather && (
                  <span className="flex items-center gap-1">
                    <Cloud className="h-3 w-3" /> {scene.weather}
                  </span>
                )}
                {scene.time_of_day && (
                  <span className="rounded-full bg-secondary px-2 py-0.5">{scene.time_of_day}</span>
                )}
                {scene.date_label && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {scene.date_label}
                  </span>
                )}
                {scene.style_preset && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-primary">{scene.style_preset}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main workspace */}
        <div className="flex gap-6" style={{ minHeight: 500 }}>
          {/* Left: Zone Diagram */}
          <div className="shrink-0">
            <ZoneDiagram
              segments={segments}
              selectedSegment={selectedSegment}
              onSelectSegment={setSelectedSegment}
            />
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(z => (
                <span key={z} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: ['#E8842A', '#1A9FD4', '#3A5EC8', '#7A3EC8'][z - 1] }}
                  />
                  {ZONE_NAMES[z]}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Segment Panel */}
          <div className="min-w-0 flex-1">
            <SegmentPanel
              sceneId={id}
              scene={scene}
              segments={segments}
              selected={selectedSegment}
              onSegmentUpdated={invalidateSegments}
              onGeneratePrompt={handleGeneratePrompt}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* Bottom: Prompt Preview */}
        <PromptPreview
          segments={segments}
          onGenerateMaster={handleGenerateMaster}
          masterPrompt={masterPrompt}
          isGeneratingMaster={isGeneratingMaster}
        />
      </div>
    </div>
  );
}
