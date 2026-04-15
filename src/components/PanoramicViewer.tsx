import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, Compass, RotateCcw } from 'lucide-react';
import * as THREE from 'three';

interface PanoramicViewerProps {
  imageUrl: string;
  alt?: string;
}

export default function PanoramicViewer({ imageUrl, alt = 'Panoramic view' }: PanoramicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ lon: 0, lat: 0 });
  const fovRef = useRef(75);
  const touchDistRef = useRef(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [compassAngle, setCompassAngle] = useState(0);
  const [fov, setFov] = useState(75);

  const initScene = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Create sphere geometry with equirectangular texture
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert sphere so texture faces inward

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    setIsLoading(true);

    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereRef.current = sphere;
        setIsLoading(false);
        setImageError(false);
      },
      undefined,
      () => {
        setImageError(true);
        setIsLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;

      // Clamp latitude
      const lat = Math.max(-85, Math.min(85, rotationRef.current.lat));
      rotationRef.current.lat = lat;

      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(rotationRef.current.lon);

      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );

      cameraRef.current.lookAt(target);
      cameraRef.current.fov = fovRef.current;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // Update compass
      setCompassAngle(rotationRef.current.lon % 360);
    };

    animate();
  }, [imageUrl]);

  // Handle resize
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !rendererRef.current || !cameraRef.current) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    rendererRef.current.setSize(width, height);
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
  }, []);

  // Initialize
  useEffect(() => {
    initScene();

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (sphereRef.current) {
        sphereRef.current.geometry.dispose();
        const material = sphereRef.current.material as THREE.MeshBasicMaterial;
        material.map?.dispose();
        material.dispose();
        sphereRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [initScene, handleResize]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;
    rotationRef.current.lon -= deltaX * 0.2;
    rotationRef.current.lat += deltaY * 0.2;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - previousMouseRef.current.x;
      const deltaY = touch.clientY - previousMouseRef.current.y;
      rotationRef.current.lon -= deltaX * 0.2;
      rotationRef.current.lat += deltaY * 0.2;
      previousMouseRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = touchDistRef.current - dist;
      fovRef.current = Math.max(30, Math.min(100, fovRef.current + delta * 0.1));
      setFov(fovRef.current);
      touchDistRef.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    fovRef.current = Math.max(30, Math.min(100, fovRef.current + e.deltaY * 0.05));
    setFov(fovRef.current);
  }, []);

  const handleZoomIn = useCallback(() => {
    fovRef.current = Math.max(30, fovRef.current - 5);
    setFov(fovRef.current);
  }, []);

  const handleZoomOut = useCallback(() => {
    fovRef.current = Math.min(100, fovRef.current + 5);
    setFov(fovRef.current);
  }, []);

  const handleReset = useCallback(() => {
    rotationRef.current = { lon: 0, lat: 0 };
    fovRef.current = 75;
    setFov(75);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Trigger resize after state update
    requestAnimationFrame(() => handleResize());
  }, [handleResize]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        requestAnimationFrame(() => handleResize());
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen, handleResize]);

  // Trigger resize when fullscreen changes
  useEffect(() => {
    const timer = setTimeout(handleResize, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen, handleResize]);

  if (imageError) {
    return (
      <div
        className="relative rounded-lg border border-border bg-black"
        style={{ aspectRatio: '32/9' }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Görüntü yüklenemedi</p>
            <p className="text-xs text-muted-foreground break-all px-4">{imageUrl}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">360° yükleniyor...</span>
          </div>
        </div>
      )}

      {/* Compass indicator */}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-background/80 px-2 py-1.5 backdrop-blur-sm">
        <div
          className="flex h-6 w-6 items-center justify-center"
          style={{ transform: `rotate(${-compassAngle}deg)` }}
        >
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(((compassAngle % 360) + 360) % 360)}°
        </span>
      </div>

      {/* 360° badge */}
      <div className="absolute left-3 bottom-3 rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
        360° VR
      </div>

      {/* Drag hint */}
      {!isDraggingRef.current && !isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100">
          <div className="rounded-lg bg-background/60 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
            Sürükleyerek 360° bakın
          </div>
        </div>
      )}

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
          {Math.round((75 / fov) * 100)}%
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
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title={isFullscreen ? 'Çık' : 'Tam Ekran'}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

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
}
