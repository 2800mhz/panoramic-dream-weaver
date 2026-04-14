import { useState } from 'react';
import { updateScene } from '@/lib/api';
import {
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  SEASON_OPTIONS,
  STYLE_PRESETS,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2, Settings2 } from 'lucide-react';
import type { Scene } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EditSceneDialogProps {
  scene: Scene;
  onUpdated: () => void;
}

export default function EditSceneDialog({ scene, onUpdated }: EditSceneDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: scene.title || '',
    location_name: scene.location_name || '',
    date_label: scene.date_label || '',
    time_of_day: scene.time_of_day || 'Noon',
    weather: scene.weather || 'Clear',
    season: scene.season || 'Summer',
    camera_height_cm: scene.camera_height_cm || 160,
    style_preset: scene.style_preset || 'Photorealistic',
    blind_zone_desc: scene.blind_zone_desc || '',
    notes: scene.notes || '',
  });

  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Başlık gereklidir');
      return;
    }
    setSubmitting(true);
    try {
      await updateScene(scene.id, {
        title: form.title,
        location_name: form.location_name || null,
        date_label: form.date_label || null,
        time_of_day: form.time_of_day,
        weather: form.weather,
        season: form.season,
        camera_height_cm: form.camera_height_cm,
        style_preset: form.style_preset,
        blind_zone_desc: form.blind_zone_desc,
        notes: form.notes || null,
      });
      toast.success('Sahne güncellendi');
      onUpdated();
      setOpen(false);
    } catch {
      toast.error('Sahne güncelleme hatası');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-border bg-input p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Settings2 className="h-3.5 w-3.5" /> Ayarları Düzenle
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Sahne Ayarlarını Düzenle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Başlık *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Konum</label>
              <input
                className={inputClass}
                value={form.location_name}
                onChange={e => update('location_name', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Tarih / Dönem</label>
              <input
                className={inputClass}
                value={form.date_label}
                onChange={e => update('date_label', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Günün Vakti</label>
              <select className={inputClass} value={form.time_of_day} onChange={e => update('time_of_day', e.target.value)}>
                {TIME_OF_DAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Hava Durumu</label>
              <select className={inputClass} value={form.weather} onChange={e => update('weather', e.target.value)}>
                {WEATHER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Mevsim</label>
              <select className={inputClass} value={form.season} onChange={e => update('season', e.target.value)}>
                {SEASON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kamera Yüksekliği (cm)</label>
              <input
                type="number"
                className={inputClass}
                value={form.camera_height_cm}
                onChange={e => update('camera_height_cm', parseInt(e.target.value) || 160)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Stil Ön Ayarı</label>
            <select className={inputClass} value={form.style_preset} onChange={e => update('style_preset', e.target.value)}>
              {STYLE_PRESETS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Kör Bölge (Blind Zone)</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.blind_zone_desc}
              onChange={e => update('blind_zone_desc', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
