import { useState, useCallback, useEffect } from 'react';
import { ZONE_NAMES, ZONE_DESCRIPTIONS, SLICE_DESCRIPTIONS } from '@/lib/constants';
import { upsertSegment } from '@/lib/api';
import type { Segment, SegmentPosition } from '@/lib/types';
import type { Scene } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SegmentPanelProps {
  sceneId: string;
  scene: Scene;
  segments: Segment[];
  selected: SegmentPosition | null;
  onSegmentUpdated: () => void;
  onGeneratePrompt: (segment: Segment) => Promise<void>;
  isGenerating: boolean;
}

export default function SegmentPanel({
  sceneId,
  scene,
  segments,
  selected,
  onSegmentUpdated,
  onGeneratePrompt,
  isGenerating,
}: SegmentPanelProps) {
  const [contentDesc, setContentDesc] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const segment = selected
    ? segments.find(s => s.zone === selected.zone && s.slice === selected.slice)
    : null;

  useEffect(() => {
    if (segment) {
      setContentDesc(segment.content_desc ?? '');
      setExtraNotes(segment.extra_notes ?? '');
    } else if (selected) {
      setContentDesc('');
      setExtraNotes('');
    }
  }, [segment, selected?.zone, selected?.slice]);

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await upsertSegment({
        scene_id: sceneId,
        zone: selected.zone,
        slice: selected.slice,
        content_desc: contentDesc || null,
        extra_notes: extraNotes || null,
        status: contentDesc ? 'described' : 'empty',
      });
      toast.success('Segment kaydedildi');
      onSegmentUpdated();
    } catch (err) {
      toast.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  }, [selected, contentDesc, extraNotes, sceneId, onSegmentUpdated]);

  // Auto-save on blur with debounce
  const handleBlur = useCallback(() => {
    if (!selected || !contentDesc.trim()) return;
    const timeout = setTimeout(() => { handleSave(); }, 800);
    return () => clearTimeout(timeout);
  }, [handleSave, selected, contentDesc]);

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-8">
        <p className="text-muted-foreground text-lg">← Bir dilime tıkla</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    empty: 'bg-muted text-muted-foreground',
    described: 'bg-accent/20 text-accent',
    prompted: 'bg-primary/20 text-primary',
    generated: 'bg-green-900/30 text-green-400',
  };

  const status = segment?.status ?? 'empty';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {ZONE_NAMES[selected.zone]} — Dilim {selected.slice}
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      {/* Spatial context */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-3 text-sm">
        <div>
          <span className="text-muted-foreground">Bölge: </span>
          <span className="text-foreground">{ZONE_DESCRIPTIONS[selected.zone]}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Dilim: </span>
          <span className="text-foreground">{SLICE_DESCRIPTIONS[selected.slice]}</span>
        </div>
      </div>

      {/* Content description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          Bu alanda ne var? (örn: taş duvar, semaver, yörük çadırı)
        </label>
        <textarea
          className="w-full rounded-lg border border-border bg-input p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          rows={3}
          value={contentDesc}
          onChange={e => setContentDesc(e.target.value)}
          onBlur={handleBlur}
          placeholder="Bu segmentteki içeriği tanımlayın..."
        />
      </div>

      {/* Extra notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          Detay notları, atmosfer, ışık...
        </label>
        <textarea
          className="w-full rounded-lg border border-border bg-input p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          value={extraNotes}
          onChange={e => setExtraNotes(e.target.value)}
          placeholder="Opsiyonel detaylar..."
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Kaydet
        </button>
        <button
          onClick={async () => {
            if (!contentDesc.trim()) {
              toast.error('Önce içerik tanımlayın');
              return;
            }
            await handleSave();
            // Build segment object directly from current state instead of waiting for query refresh
            const segmentForGeneration: Segment = {
              id: segment?.id ?? '',
              scene_id: sceneId,
              zone: selected.zone,
              slice: selected.slice,
              content_desc: contentDesc,
              extra_notes: extraNotes || null,
              generated_prompt: segment?.generated_prompt ?? null,
              image_url: segment?.image_url ?? null,
              status: 'described',
              updated_at: null,
            };
            await onGeneratePrompt(segmentForGeneration);
          }}
          disabled={isGenerating || !contentDesc}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
          Prompt Üret
        </button>
      </div>

      {/* Generated prompt preview */}
      {segment?.generated_prompt && (
        <div className="mt-2 rounded-lg bg-secondary/50 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Üretilen Prompt:</p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/80">
            {segment.generated_prompt}
          </pre>
        </div>
      )}

      {/* Image thumbnail */}
      {segment?.image_url && (
        <img
          src={segment.image_url}
          alt="Generated segment"
          className="mt-2 rounded-lg border border-border"
        />
      )}
    </div>
  );
}
