import { useState } from 'react';
import { ZONE_NAMES } from '@/lib/constants';
import type { Segment } from '@/lib/types';
import { Copy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PromptPreviewProps {
  segments: Segment[];
  onGenerateMaster: () => Promise<void>;
  masterPrompt: string;
  isGeneratingMaster: boolean;
}

export default function PromptPreview({ segments, onGenerateMaster, masterPrompt, isGeneratingMaster }: PromptPreviewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'prompts' | 'master'>('overview');
  const [expanded, setExpanded] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı');
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
                        <button
                          onClick={() => copyToClipboard(seg.generated_prompt!)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" /> Kopyala
                        </button>
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
              <button
                onClick={onGenerateMaster}
                disabled={isGeneratingMaster}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isGeneratingMaster && <Loader2 className="h-4 w-4 animate-spin" />}
                Master Prompt Üret
              </button>
              {masterPrompt && (
                <>
                  <pre className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-4 font-mono text-xs text-foreground/80">
                    {masterPrompt}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(masterPrompt)}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" /> Tümünü Kopyala
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
