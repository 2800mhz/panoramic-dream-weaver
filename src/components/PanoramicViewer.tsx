import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface PanoramicViewerProps {
  imageUrl: string;
  alt?: string;
}

export default function PanoramicViewer({ imageUrl, alt = 'Panoramic view' }: PanoramicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.15, 5));
    } else {
      setScale(prev => {
        const next = Math.max(prev - 0.15, 0.5);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  if (imageError) {
    return (
      <div
        className="relative rounded-lg border border-border bg-black"
        style={{ aspectRatio: '32/9' }}
      >
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Görüntü yüklenemedi</p>
        </div>
      </div>
    );
  }

  const viewerContent = (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg border border-border bg-black ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      style={isFullscreen ? undefined : { aspectRatio: '32/9' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <img
        src={imageUrl}
        alt={alt}
        onError={() => setImageError(true)}
        className="h-full w-full select-none object-contain"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
        draggable={false}
      />

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-background/80 p-1 backdrop-blur-sm">
        <button
          onClick={handleZoomOut}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Uzaklaştır"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Yakınlaştır"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={handleReset}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Sıfırla"
        >
          <Move className="h-4 w-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title={isFullscreen ? 'Çık' : 'Tam Ekran'}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Scale > 1 indicator */}
      {scale > 1 && (
        <div className="absolute left-3 top-3 rounded-md bg-background/60 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Kaydırmak için sürükleyin
        </div>
      )}

      {/* Fullscreen close */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute right-3 top-3 rounded-lg bg-background/80 px-3 py-1.5 text-sm text-foreground backdrop-blur-sm hover:bg-background"
        >
          ESC ile çık
        </button>
      )}
    </div>
  );

  return viewerContent;
}
