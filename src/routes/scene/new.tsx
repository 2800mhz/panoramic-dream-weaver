import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { createScene } from '@/lib/api';
import { useAuthContext } from '@/hooks/useAuthContext';
import {
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  SEASON_OPTIONS,
  STYLE_PRESETS,
  DEFAULT_BLIND_ZONE,
} from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/scene/new')({
  head: () => ({
    meta: [
      { title: 'Yeni Sahne — 360° VR Prompt Builder' },
      { name: 'description', content: 'Create a new 360° panoramic scene' },
    ],
  }),
  component: NewScenePage,
});

function NewScenePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/auth/login' });
    }
  }, [user, authLoading, navigate]);

  const [form, setForm] = useState({
    title: '',
    location_name: '',
    date_label: '',
    time_of_day: 'Noon',
    weather: 'Clear',
    season: 'Summer',
    camera_height_cm: 160,
    style_preset: 'Photorealistic',
    blind_zone_desc: DEFAULT_BLIND_ZONE,
    notes: '',
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
      if (!user) {
        toast.error('Giriş yapmanız gerekiyor');
        navigate({ to: '/auth/login' });
        return;
      }
      const scene = await createScene({
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
        user_id: user.id,
      });
      toast.success('Sahne oluşturuldu');
      navigate({ to: '/scene/$id', params: { id: scene.id } });
    } catch {
      toast.error('Sahne oluşturma hatası');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-input p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const labelClass = 'mb-1.5 block text-sm font-medium text-muted-foreground';

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Sahnelere dön
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-foreground">Yeni Sahne Oluştur</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Başlık *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="Sahne başlığı"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Konum</label>
            <input
              className={inputClass}
              value={form.location_name}
              onChange={e => update('location_name', e.target.value)}
              placeholder="ör: Kapadokya, peri bacaları arasında"
            />
          </div>

          <div>
            <label className={labelClass}>Tarih / Dönem</label>
            <input
              className={inputClass}
              value={form.date_label}
              onChange={e => update('date_label', e.target.value)}
              placeholder="ör: Sonbahar 1850"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
            <label className={labelClass}>Kör Bölge Tanımı</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.blind_zone_desc}
              onChange={e => update('blind_zone_desc', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Notlar (opsiyonel)</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Genel sahne notları..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sahne Oluştur
          </button>
        </form>
      </div>
    </div>
  );
}
