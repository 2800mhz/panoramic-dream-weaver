import { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  sceneId: string;
  currentImageUrl?: string | null;
  onUploaded: (url: string) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUpload({ sceneId, currentImageUrl, onUploaded }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [aspectWarning, setAspectWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return 'Desteklenmeyen format. JPEG, PNG veya WebP kullanın.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Dosya boyutu 20MB\'dan büyük olamaz.';
    }
    return null;
  }, []);

  const checkAspectRatio = useCallback((file: File): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const target = 32 / 9; // ~3.555
        // 0.3 tolerance allows ratios roughly from 3.25:1 to 3.85:1,
        // accommodating common panoramic formats close to 32:9
        const tolerance = 0.3;
        if (Math.abs(ratio - target) > tolerance) {
          setAspectWarning(
            `Görüntü oranı ${ratio.toFixed(2)}:1 — 32:9 (${target.toFixed(2)}:1) idealdir. Panoramik görüntü önerilir.`
          );
        } else {
          setAspectWarning('');
        }
        URL.revokeObjectURL(img.src);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve();
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    await checkAspectRatio(file);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${sceneId}/panoramic.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('scenes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('scenes')
        .getPublicUrl(filePath);

      // Append cache-busting parameter to prevent stale/cached 400 responses
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      onUploaded(urlWithCacheBust);
      toast.success('Görüntü yüklendi');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yükleme hatası';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [sceneId, validateFile, checkAspectRatio, onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, [uploadFile]);

  return (
    <div className="space-y-3">
      {currentImageUrl ? (
        <button
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Görüntüyü Değiştir
        </button>
      ) : (
        <>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            32:9 Panoramik Görüntü
          </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          style={{ aspectRatio: '32/9' }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Yükleniyor...</span>
            </div>
          ) : (
            <>
              <div className="mb-3 rounded-full bg-primary/10 p-3">
                {dragOver ? (
                  <Upload className="h-6 w-6 text-primary" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {dragOver ? 'Bırakın' : 'Görüntü yükleyin'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sürükle-bırak veya tıklayın · JPEG, PNG, WebP · Max 20MB
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Önerilen oran: 32:9 (panoramik)
              </p>
            </>
          )}
        </div>
        </>
      )}

      {aspectWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-xs text-accent">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{aspectWarning}</span>
          <button onClick={() => setAspectWarning('')} className="ml-auto shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
