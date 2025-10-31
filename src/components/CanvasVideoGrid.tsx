import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Slider } from './ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface VideoData {
  [slotId: string]: string;
}

interface CanvasVideoGridProps {
  videos: VideoData;
  occupiedSlots: Set<string>;
  onVideoView: (slotId: string, video: string) => void;
  selectedSlots?: Set<string>;
  onSelectionChange?: (selectedSlots: Set<string>) => void;
  onSlotClick?: (slotId: string) => void;
}

const GRID_SIZE = 1000;
const BASE_SLOT_SIZE = 40;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const CanvasVideoGrid: React.FC<CanvasVideoGridProps> = ({
  videos,
  occupiedSlots,
  onVideoView,
  selectedSlots = new Set(),
  onSelectionChange,
  onSlotClick
}) => {
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastClickTime = useRef<number>(0);
  const lastClickSlot = useRef<string>('');

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const slotSize = BASE_SLOT_SIZE * zoom;
    const startCol = Math.floor(scrollPos.x / slotSize);
    const endCol = Math.min(GRID_SIZE, Math.ceil((scrollPos.x + dimensions.width) / slotSize) + 1);
    const startRow = Math.floor(scrollPos.y / slotSize);
    const endRow = Math.min(GRID_SIZE, Math.ceil((scrollPos.y + dimensions.height) / slotSize) + 1);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get CSS variables for colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryHsl = computedStyle.getPropertyValue('--primary').trim();
    const mutedHsl = computedStyle.getPropertyValue('--muted').trim();
    const accentHsl = computedStyle.getPropertyValue('--accent').trim();
    const borderHsl = computedStyle.getPropertyValue('--border').trim();

    // Helper to convert HSL to rgba
    const hslToRgba = (hsl: string, alpha: number = 1) => {
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
      return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    };

    // Colors for different states
    const colors = {
      free: hslToRgba(mutedHsl, 0.3),
      occupied: hslToRgba('30 70% 60%', 0.3), // Orange for occupied
      video: hslToRgba(accentHsl, 0.5),
      selected: hslToRgba(primaryHsl, 0.4),
      border: hslToRgba(borderHsl, 0.2),
      selectedBorder: hslToRgba(primaryHsl, 0.8)
    };

    // Performance optimization: batch draw by state
    const freeSlotsPath = new Path2D();
    const occupiedSlotsPath = new Path2D();
    const videoSlotsPath = new Path2D();
    const selectedSlotsPath = new Path2D();

    // Determine if in drag selection
    const dragSelection = isDragging && dragStart && dragEnd ? {
      minRow: Math.min(dragStart.row, dragEnd.row),
      maxRow: Math.max(dragStart.row, dragEnd.row),
      minCol: Math.min(dragStart.col, dragEnd.col),
      maxCol: Math.max(dragStart.col, dragEnd.col)
    } : null;

    // Draw slots
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const slotId = `${row}-${col}`;
        const x = col * slotSize - scrollPos.x;
        const y = row * slotSize - scrollPos.y;

        const isSelected = selectedSlots.has(slotId);
        const isInDragSelection = dragSelection && 
          row >= dragSelection.minRow && row <= dragSelection.maxRow &&
          col >= dragSelection.minCol && col <= dragSelection.maxCol &&
          !occupiedSlots.has(slotId);

        // Choose which path to add to
        if (isSelected || isInDragSelection) {
          selectedSlotsPath.rect(x, y, slotSize, slotSize);
        } else if (videos[slotId]) {
          videoSlotsPath.rect(x, y, slotSize, slotSize);
        } else if (occupiedSlots.has(slotId)) {
          occupiedSlotsPath.rect(x, y, slotSize, slotSize);
        } else {
          freeSlotsPath.rect(x, y, slotSize, slotSize);
        }
      }
    }

    // Batch fill all slots by type
    ctx.fillStyle = colors.free;
    ctx.fill(freeSlotsPath);

    ctx.fillStyle = colors.occupied;
    ctx.fill(occupiedSlotsPath);

    ctx.fillStyle = colors.video;
    ctx.fill(videoSlotsPath);

    ctx.fillStyle = colors.selected;
    ctx.fill(selectedSlotsPath);

    // Draw borders only when zoomed in enough
    if (zoom > 0.5) {
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = Math.max(0.5, zoom * 0.5);

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const slotId = `${row}-${col}`;
          const x = col * slotSize - scrollPos.x;
          const y = row * slotSize - scrollPos.y;

          const isSelected = selectedSlots.has(slotId);
          const isInDragSelection = dragSelection && 
            row >= dragSelection.minRow && row <= dragSelection.maxRow &&
            col >= dragSelection.minCol && col <= dragSelection.maxCol &&
            !occupiedSlots.has(slotId);

          if (isSelected || isInDragSelection) {
            ctx.strokeStyle = colors.selectedBorder;
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = Math.max(0.5, zoom * 0.5);
          }

          ctx.strokeRect(x, y, slotSize, slotSize);
        }
      }
    }

    // Draw drag selection rectangle
    if (isDragging && dragStart && dragEnd) {
      const slotSize = BASE_SLOT_SIZE * zoom;
      const x1 = dragStart.col * slotSize - scrollPos.x;
      const y1 = dragStart.row * slotSize - scrollPos.y;
      const x2 = (dragEnd.col + 1) * slotSize - scrollPos.x;
      const y2 = (dragEnd.row + 1) * slotSize - scrollPos.y;

      ctx.strokeStyle = hslToRgba(primaryHsl, 0.8);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1)
      );
      ctx.setLineDash([]);
    }

  }, [zoom, dimensions, scrollPos, videos, occupiedSlots, selectedSlots, isDragging, dragStart, dragEnd]);

  // Convert mouse position to slot coordinates
  const getSlotFromMouse = (e: React.MouseEvent): { row: number; col: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollPos.x;
    const y = e.clientY - rect.top + scrollPos.y;

    const slotSize = BASE_SLOT_SIZE * zoom;
    const col = Math.floor(x / slotSize);
    const row = Math.floor(y / slotSize);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const slot = getSlotFromMouse(e);
    if (!slot) return;

    setIsDragging(true);
    setDragStart(slot);
    setDragEnd(slot);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const slot = getSlotFromMouse(e);
    if (slot) {
      setDragEnd(slot);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStart) {
      setIsDragging(false);
      return;
    }

    const slot = getSlotFromMouse(e);
    if (!slot) {
      setIsDragging(false);
      return;
    }

    // Check for double-click
    const slotId = `${slot.row}-${slot.col}`;
    const now = Date.now();
    const isDoubleClick = now - lastClickTime.current < 300 && slotId === lastClickSlot.current;
    lastClickTime.current = now;
    lastClickSlot.current = slotId;

    if (isDoubleClick) {
      // Double click - view video or show info
      if (videos[slotId]) {
        onVideoView(slotId, videos[slotId]);
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Single click or drag
    if (!isDragging || !dragEnd) {
      // Single click
      if (onSlotClick && !occupiedSlots.has(slotId)) {
        onSlotClick(slotId);
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Drag selection
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);

    const newSelection = new Set<string>();
    for (let row = minRow; row <= maxRow && row < GRID_SIZE; row++) {
      for (let col = minCol; col <= maxCol && col < GRID_SIZE; col++) {
        const slotId = `${row}-${col}`;
        if (!occupiedSlots.has(slotId)) {
          newSelection.add(slotId);
        }
      }
    }

    onSelectionChange?.(newSelection);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setScrollPos({
        x: target.scrollLeft,
        y: target.scrollTop
      });
    });
  };

  const slotSize = BASE_SLOT_SIZE * zoom;
  const totalWidth = GRID_SIZE * slotSize;
  const totalHeight = GRID_SIZE * slotSize;

  return (
    <div className="w-full h-full bg-background relative">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-3 min-w-[200px]">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground min-w-[40px]">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto"
        onScroll={handleScroll}
        style={{ cursor: isDragging ? 'crosshair' : 'default' }}
      >
        <div style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0"
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              position: 'sticky',
              top: 0,
              left: 0
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
};

export default CanvasVideoGrid;
