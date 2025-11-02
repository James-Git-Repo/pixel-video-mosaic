import React, { useRef, useEffect, useState, useCallback } from 'react';

const GRID_SIZE = 1000;

interface VideoData {
  [slotId: string]: string;
}

interface CanvasVideoGridProps {
  videos: VideoData;
  occupiedSlots: Set<string>;
  selectedSlots: Set<string>;
  onVideoView: (slotId: string, video: string) => void;
  onSlotClick: (slotId: string) => void;
  onSelectionChange: (selection: Set<string>) => void;
}

const CanvasVideoGrid: React.FC<CanvasVideoGridProps> = ({
  videos,
  occupiedSlots,
  selectedSlots,
  onVideoView,
  onSlotClick,
  onSelectionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

  // Calculate slot dimensions
  const slotWidth = dimensions.width / GRID_SIZE;
  const slotHeight = dimensions.height / GRID_SIZE;

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Get slot ID from coordinates
  const getSlotFromCoords = useCallback((col: number, row: number): string => {
    return `${row}-${col}`;
  }, []);

  // Get coordinates from mouse event
  const getCoordsFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x / dimensions.width) * GRID_SIZE);
    const row = Math.floor((y / dimensions.height) * GRID_SIZE);

    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }, [dimensions]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Calculate visible area (with some buffer for smooth panning)
    const startCol = Math.max(0, Math.floor(-offset.x / slotWidth) - 10);
    const endCol = Math.min(GRID_SIZE, Math.ceil((-offset.x + dimensions.width) / slotWidth) + 10);
    const startRow = Math.max(0, Math.floor(-offset.y / slotHeight) - 10);
    const endRow = Math.min(GRID_SIZE, Math.ceil((-offset.y + dimensions.height) / slotHeight) + 10);

    // Calculate drag selection rectangle
    let dragSelection: Set<string> | null = null;
    if (isDragging && dragStart && dragEnd) {
      dragSelection = new Set<string>();
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          dragSelection.add(getSlotFromCoords(col, row));
        }
      }
    }

    // Render visible slots
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const slotId = getSlotFromCoords(col, row);
        const x = col * slotWidth + offset.x;
        const y = row * slotHeight + offset.y;

        // Skip if completely outside viewport
        if (x + slotWidth < 0 || x > dimensions.width || y + slotHeight < 0 || y > dimensions.height) {
          continue;
        }

        const isOccupied = occupiedSlots.has(slotId);
        const isSelected = selectedSlots.has(slotId) || dragSelection?.has(slotId);
        const isHovered = hoveredSlot === slotId;

        // Choose slot color based on state
        if (isSelected) {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.6)'; // Purple with transparency
        } else if (isOccupied) {
          ctx.fillStyle = 'rgba(236, 72, 153, 0.8)'; // Pink for occupied
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)'; // Light blue on hover
        } else {
          ctx.fillStyle = 'rgba(30, 30, 30, 0.8)'; // Dark gray for empty
        }

        ctx.fillRect(x, y, slotWidth, slotHeight);

        // Draw border
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, slotWidth, slotHeight);
      }
    }

    // Draw drag selection rectangle outline
    if (isDragging && dragStart && dragEnd) {
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);

      const x = minCol * slotWidth + offset.x;
      const y = minRow * slotHeight + offset.y;
      const width = (maxCol - minCol + 1) * slotWidth;
      const height = (maxRow - minRow + 1) * slotHeight;

      ctx.strokeStyle = 'rgba(168, 85, 247, 1)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }, [dimensions, offset, occupiedSlots, selectedSlots, isDragging, dragStart, dragEnd, hoveredSlot, slotWidth, slotHeight, getSlotFromCoords]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2) { // Middle or right click for panning
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }

    const coords = getCoordsFromEvent(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStart(coords);
    setDragEnd(coords);
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPos.x;
      const deltaY = e.clientY - lastPanPos.y;
      setOffset(prev => ({
        x: Math.min(0, Math.max(prev.x + deltaX, dimensions.width - GRID_SIZE * slotWidth)),
        y: Math.min(0, Math.max(prev.y + deltaY, dimensions.height - GRID_SIZE * slotHeight))
      }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCoordsFromEvent(e);
    if (!coords) {
      setHoveredSlot(null);
      return;
    }

    setHoveredSlot(getSlotFromCoords(coords.col, coords.row));

    if (isDragging) {
      setDragEnd(coords);
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDragging || !dragStart || !dragEnd) return;

    // Calculate final selection
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);

    const newSelection = new Set<string>();
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        newSelection.add(getSlotFromCoords(col, row));
      }
    }

    onSelectionChange(newSelection);

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Handle double click
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordsFromEvent(e);
    if (!coords) return;

    const slotId = getSlotFromCoords(coords.col, coords.row);
    
    if (occupiedSlots.has(slotId) && videos[slotId]) {
      onVideoView(slotId, videos[slotId]);
    } else {
      onSlotClick(slotId);
    }
  };

  // Handle wheel for zoom (optional feature)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // Could implement zoom here in the future
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ cursor: isPanning ? 'grabbing' : (isDragging ? 'crosshair' : 'default') }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setIsPanning(false);
          setHoveredSlot(null);
        }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full"
      />
    </div>
  );
};

export default CanvasVideoGrid;
