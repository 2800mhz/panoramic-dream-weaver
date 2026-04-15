import { useState } from 'react';
import { ZONE_NAMES } from '@/lib/constants';
import type { Segment } from '@/lib/types';
import { Copy, ChevronDown, ChevronUp, Loader2, Download, FileJson, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PromptPreviewProps {
  segments: Segment[];
  onGenerateMaster: () => Promise<void>;
  masterPrompt: string;
  isGeneratingMaster: boolean;
}

type ExportFormat = 'json' | 'txt' | 'custom';

function buildMidjourneyJson(masterPrompt: string, segments: Segment[]) {
  return JSON.stringify({
    version: '1.0',
    format: 'equirectangular_32_9',
    type: '360_panoramic_video',
    master_prompt: masterPrompt,
    parameters: {
      aspect_ratio: '32:9',
      quality: 'ultra',
      style: 'raw',
      chaos: 0,
      no: 'seams, edges, stitching, borders, text, watermark',
    },
    segments: segments
      .filter(s => s.generated_prompt)
      .map(s => ({
        zone: s.zone,
        zone_name: ZONE_NAMES[s.zone],
        slice: s.slice,
        prompt: s.generated_prompt,
        motion_type: s.motion_type || 'static',
        camera_speed: s.camera_speed || 'slow',
        lighting_direction: s.lighting_direction || 'natural',
      })),
  }, null, 2);
}

function buildStableDiffusionTxt(masterPrompt: string, segments: Segment[]) {
  const lines = [
    '# 360° Panoramic Video Prompt — Stable Diffusion Format',
    '# Format: Equirectangular 32:9 | Resolution: 4K | Type: 360° VR',
    '',
    '## MASTER PROMPT',
    masterPrompt,
    '',
    '## NEGATIVE PROMPT',
    'visible seams, stitching artifacts, edges, borders, text, watermark, low quality, blurry, distorted, deformed, ugly, duplicate, cut off, out of frame',
    '',
    '## PARAMETERS',
    'Sampler: DPM++ 2M Karras',
    'Steps: 30',
    'CFG Scale: 7',
    'Size: 3840x1080 (32:9)',
    'Seed: -1',
    '',
    '## SEGMENT PROMPTS',
  ];

  segments
    .filter(s => s.generated_prompt)
    .forEach(s => {
      lines.push('');
      lines.push(`### ${ZONE_NAMES[s.zone]} — Slice ${s.slice}`);
      lines.push(`Motion: ${s.motion_type || 'static'} | Speed: ${s.camera_speed || 'slow'} | Light: ${s.lighting_direction || 'natural'}`);
      lines.push(s.generated_prompt!);
    });

  return lines.join('\n');
}

export default function PromptPreview({ segments, onGenerateMaster, masterPrompt, isGeneratingMaster }: PromptPreviewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'prompts' | 'master'>('overview');
  const [expanded, setExpanded] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı');
  };

  const handleExport = (format: ExportFormat) => {
    if (!masterPrompt) {
      toast.error('Önce master prompt üretin');
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = buildMidjourneyJson(masterPrompt, segments);
        filename = 'panoramic-360-prompt.json';
        mimeType = 'application/json';
        break;
      case 'txt':
        content = buildStableDiffusionTxt(masterPrompt, segments);
        filename = 'panoramic-360-prompt.txt';
        mimeType = 'text/plain';
        break;
      case 'custom':
        content = masterPrompt;
        filename = 'panoramic-360-prompt-raw.txt';
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} indirildi`);
  };

  const statusColors: Record<string, string> = {
    empty: 'bg-muted/50 text-muted-foreground',
    described: 'bg-accent/20 text-accent',
    prompted: 'bg-primary/20 text-primary',
    generated: 'bg-green-900/30 text-green-400',
  };

  const tabs = [
    { key: 'overview' as const, label: 'Tüm Sahne Özeti' },
    { key: 'prompts' as const, label: 'Üretilen Promptlar' },
    { key: 'master' as const, label: 'Sahne Master Promptu' },
  ];

  return (
    <div className="mt-6 rounded-xl border border-border bg-card">
      <div className="flex w-full items-center justify-between p-4">
        <div className="flex gap-2" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => { setActiveTab(tab.key); setExpanded(true); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label="Toggle preview"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4].map(zone => (
                <div key={zone} className="col-span-3">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{ZONE_NAMES[zone]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(slice => {
                      const seg = segments.find(s => s.zone === zone && s.slice === slice);
                      const status = seg?.status ?? 'empty';
                      return (
                        <div key={slice} className={`rounded-lg p-2.5 text-xs ${statusColors[status]}`}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">Dilim {slice}</span>
                            <span className="text-[10px] opacity-70">{status}</span>
                          </div>
                          <p className="truncate opacity-80">
                            {seg?.content_desc?.slice(0, 40) || '—'}
                          </p>
                          {seg?.motion_type && (
                            <p className="mt-1 truncate text-[10px] opacity-60">
                              🎬 {seg.motion_type} · {seg.camera_speed || 'slow'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-3">
              {segments.filter(s => s.generated_prompt).length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz üretilmiş prompt yok.</p>
              ) : (
                segments
                  .filter(s => s.generated_prompt)
                  .map(seg => (
                    <div key={seg.id} className="rounded-lg bg-secondary/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {ZONE_NAMES[seg.zone]} — Dilim {seg.slice}
                        </span>
                        <div className="flex items-center gap-2">
                          {seg.motion_type && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                              🎬 {seg.motion_type}
                            </span>
                          )}
                          <button
                            onClick={() => copyToClipboard(seg.generated_prompt!)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" /> Kopyala
                          </button>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/80">
                        {seg.generated_prompt}
                      </pre>
                    </div>
                  ))
              )}
            </div>
          )}

          {activeTab === 'master' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={onGenerateMaster}
                  disabled={isGeneratingMaster}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isGeneratingMaster && <Loader2 className="h-4 w-4 animate-spin" />}
                  Master Prompt Üret
                </button>
              </div>

              {/* Video Parameters Info */}
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">360° Video Parametreleri</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <div className="rounded bg-background/50 p-2">
                    <span className="block font-medium text-foreground">Format</span>
                    <span>Equirectangular 32:9</span>
                  </div>
                  <div className="rounded bg-background/50 p-2">
                    <span className="block font-medium text-foreground">Çözünürlük</span>
                    <span>4K (3840×1080)</span>
                  </div>
                  <div className="rounded bg-background/50 p-2">
                    <span className="block font-medium text-foreground">Projeksiyon</span>
                    <span>360° Küresel</span>
                  </div>
                  <div className="rounded bg-background/50 p-2">
                    <span className="block font-medium text-foreground">VR Uyumlu</span>
                    <span>WebXR Ready</span>
                  </div>
                </div>
              </div>

              {masterPrompt && (
                <>
                  <pre className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-4 font-mono text-xs text-foreground/80">
                    {masterPrompt}
                  </pre>

                  {/* Export Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(masterPrompt)}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" /> Tümünü Kopyala
                    </button>
                    <div className="mx-1 h-4 w-px bg-border" />
                    <button
                      onClick={() => handleExport('json')}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-blue-500/50 hover:text-blue-400"
                    >
                      <FileJson className="h-3 w-3" /> JSON (Midjourney)
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-green-500/50 hover:text-green-400"
                    >
                      <FileText className="h-3 w-3" /> TXT (Stable Diffusion)
                    </button>
                    <button
                      onClick={() => handleExport('custom')}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-purple-500/50 hover:text-purple-400"
                    >
                      <Download className="h-3 w-3" /> Raw Prompt
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
