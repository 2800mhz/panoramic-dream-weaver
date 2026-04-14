import { useRef, useEffect, useCallback, useState } from 'react';
import { ZONE_COLORS } from '@/lib/constants';
import type { Segment, SegmentPosition } from '@/lib/types';

interface ZoneDiagramProps {
  segments: Segment[];
  selectedSegment: SegmentPosition | null;
  onSelectSegment: (pos: SegmentPosition) => void;
}

const CX = 240;
const CY = 240;
const ZONE_RADII = [
  { inner: 0, outer: 85 },
  { inner: 85, outer: 160 },
  { inner: 160, outer: 210 },
  { inner: 210, outer: 225 },
];

// Visible arc: 270° centered at top. Blind zone: bottom 90°.
// We rotate so that the visible arc spans from -225° to 45° (or equivalently 135° to 405° / -225° to 45°)
// Let's define: visible starts at 225° (bottom-left going clockwise to bottom-right at 315° through top)
// Actually: blind zone at bottom = from 45° to 135° in standard math coords
// Let's use canvas angles (0=right, clockwise positive):
// Blind zone: centered at bottom (270° in canvas coords = PI*1.5)
// Blind zone spans 90°: from 225° to 315° in canvas coords (PI*1.25 to PI*1.75)
// Visible: from 315° to 225° (going clockwise through 0°/360°)
// That's 270° of visible arc.

const BLIND_START = (225 * Math.PI) / 180; // 225° canvas
const BLIND_END = (315 * Math.PI) / 180;   // 315° canvas
const VISIBLE_START = BLIND_END; // 315°
const VISIBLE_SPAN = (270 * Math.PI) / 180; // 270°
const SLICE_SPAN = VISIBLE_SPAN / 3;

function getSliceAngles(slice: number): { start: number; end: number } {
  const start = VISIBLE_START + (slice - 1) * SLICE_SPAN;
  const end = start + SLICE_SPAN;
  return { start, end };
}

function isPointInSegment(x: number, y: number, zone: number, slice: number): boolean {
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = ZONE_RADII[zone - 1];
  if (dist < r.inner || dist > r.outer) return false;

  let angle = Math.atan2(dy, dx); // -PI to PI
  if (angle < 0) angle += 2 * Math.PI; // 0 to 2PI

  const { start, end } = getSliceAngles(slice);
  // Normalize start and end to 0-2PI range
  const normStart = ((start % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const normEnd = ((end % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  if (normStart <= normEnd) {
    return angle >= normStart && angle <= normEnd;
  } else {
    // Wraps around 0/2PI boundary
    return angle >= normStart || angle <= normEnd;
  }
}

function getSegmentCentroid(zone: number, slice: number): { x: number; y: number } {
  const r = ZONE_RADII[zone - 1];
  const midR = (r.inner + r.outer) / 2;
  const { start, end } = getSliceAngles(slice);
  let midA = (start + end) / 2;
  return {
    x: CX + midR * Math.cos(midA),
    y: CY + midR * Math.sin(midA),
  };
}

export default function ZoneDiagram({ segments, selectedSegment, onSelectSegment }: ZoneDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<SegmentPosition | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 480, 480);

    // Draw blind zone first (full circle background)
    ctx.beginPath();
    ctx.arc(CX, CY, 225, BLIND_START, BLIND_END);
    ctx.lineTo(CX, CY);
    ctx.closePath();
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();

    // Draw visible zone segments
    for (let z = 4; z >= 1; z--) {
      for (let s = 1; s <= 3; s++) {
        const r = ZONE_RADII[z - 1];
        const { start, end } = getSliceAngles(s);
        const isHovered = hovered?.zone === z && hovered?.slice === s;
        const isSelected = selectedSegment?.zone === z && selectedSegment?.slice === s;

        ctx.beginPath();
        ctx.arc(CX, CY, r.outer, start, end);
        ctx.arc(CX, CY, r.inner, end, start, true);
        ctx.closePath();

        const baseColor = ZONE_COLORS[z as keyof typeof ZONE_COLORS];
        ctx.fillStyle = isHovered ? lightenColor(baseColor, 0.3) : baseColor;
        ctx.globalAlpha = isSelected ? 1 : 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Border
        ctx.strokeStyle = isSelected ? '#ffffff' : '#30363d';
        ctx.lineWidth = isSelected ? 2.5 : 0.8;
        ctx.stroke();

        // Content dot
        const seg = segments.find(sg => sg.zone === z && sg.slice === s);
        if (seg && seg.status !== 'empty') {
          const c = getSegmentCentroid(z, s);
          ctx.beginPath();
          ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }
    }

    // Blind zone label
    ctx.save();
    ctx.font = '11px Inter, system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const blindMidAngle = (BLIND_START + BLIND_END) / 2;
    const lblX = CX + 120 * Math.cos(blindMidAngle);
    const lblY = CY + 120 * Math.sin(blindMidAngle);
    ctx.fillText('kör bölge', lblX, lblY);
    ctx.restore();

    // Zone labels (on left side)
    ctx.save();
    ctx.font = '10px Inter, system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let z = 1; z <= 4; z++) {
      const r = ZONE_RADII[z - 1];
      const midR = (r.inner + r.outer) / 2;
      // Place label at the leftmost visible angle area
      const labelAngle = VISIBLE_START + SLICE_SPAN * 0.15;
      const lx = CX + midR * Math.cos(labelAngle);
      const ly = CY + midR * Math.sin(labelAngle);
      const names = ['1', '2', '3', '4'];
      ctx.fillText(names[z - 1], lx, ly);
    }
    ctx.restore();

    // Slice numbers inside each zone-slice
    ctx.save();
    ctx.font = '9px Inter, system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let s = 1; s <= 3; s++) {
      // Only show in zone 2 for clarity
      const c = getSegmentCentroid(2, s);
      ctx.fillText(`D${s}`, c.x, c.y - 12);
    }
    ctx.restore();

    // Camera dot at center
    ctx.beginPath();
    ctx.arc(CX, CY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [segments, selectedSegment, hovered]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * (480 / rect.width);
    const y = (e.clientY - rect.top) * (480 / rect.height);

    for (let z = 1; z <= 4; z++) {
      for (let s = 1; s <= 3; s++) {
        if (isPointInSegment(x, y, z, s)) {
          setHovered({ zone: z, slice: s });
          return;
        }
      }
    }
    setHovered(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * (480 / rect.width);
    const y = (e.clientY - rect.top) * (480 / rect.height);

    for (let z = 1; z <= 4; z++) {
      for (let s = 1; s <= 3; s++) {
        if (isPointInSegment(x, y, z, s)) {
          onSelectSegment({ zone: z, slice: s });
          return;
        }
      }
    }
  }, [onSelectSegment]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={480}
      className="cursor-pointer rounded-xl border border-border bg-secondary/30"
      style={{ width: 480, height: 480 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
      onClick={handleClick}
    />
  );
}

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + (255 - r) * amount)}, ${Math.min(255, g + (255 - g) * amount)}, ${Math.min(255, b + (255 - b) * amount)})`;
}
