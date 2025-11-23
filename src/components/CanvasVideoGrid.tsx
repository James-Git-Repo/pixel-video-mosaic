import React, { useRef, useEffect, useState, useCallback, memo } from 'react';

const GRID_SIZE = 100;

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
  const rafRef = useRef<number>();
  
  // Track previous state for dirty rectangle rendering
  const prevStateRef = useRef({
    hoveredSlot: null as string | null,
    selectedSlots: new Set<string>(),
    occupiedSlots: new Set<string>(),
    isDragging: false,
    dragStart: null as { row: number; col: number } | null,
    dragEnd: null as { row: number; col: number } | null
  });

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

  // Render canvas with dirty rectangle optimization
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const prevState = prevStateRef.current;
    const changedSlots = new Set<string>();
    
    // Detect hover changes
    if (hoveredSlot !== prevState.hoveredSlot) {
      if (prevState.hoveredSlot) changedSlots.add(prevState.hoveredSlot);
      if (hoveredSlot) changedSlots.add(hoveredSlot);
    }
    
    // Detect selection changes
    selectedSlots.forEach(slot => {
      if (!prevState.selectedSlots.has(slot)) changedSlots.add(slot);
    });
    prevState.selectedSlots.forEach(slot => {
      if (!selectedSlots.has(slot)) changedSlots.add(slot);
    });
    
    // Detect occupied slots changes
    occupiedSlots.forEach(slot => {
      if (!prevState.occupiedSlots.has(slot)) changedSlots.add(slot);
    });
    prevState.occupiedSlots.forEach(slot => {
      if (!occupiedSlots.has(slot)) changedSlots.add(slot);
    });
    
    // If dragging state changed, mark all slots in drag areas as changed
    if (isDragging !== prevState.isDragging || dragStart !== prevState.dragStart || dragEnd !== prevState.dragEnd) {
      // Mark previous drag area
      if (prevState.isDragging && prevState.dragStart && prevState.dragEnd) {
        const minRow = Math.min(prevState.dragStart.row, prevState.dragEnd.row);
        const maxRow = Math.max(prevState.dragStart.row, prevState.dragEnd.row);
        const minCol = Math.min(prevState.dragStart.col, prevState.dragEnd.col);
        const maxCol = Math.max(prevState.dragStart.col, prevState.dragEnd.col);
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            changedSlots.add(getSlotFromCoords(col, row));
          }
        }
      }
      // Mark current drag area
      if (isDragging && dragStart && dragEnd) {
        const minRow = Math.min(dragStart.row, dragEnd.row);
        const maxRow = Math.max(dragStart.row, dragEnd.row);
        const minCol = Math.min(dragStart.col, dragEnd.col);
        const maxCol = Math.max(dragStart.col, dragEnd.col);
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            changedSlots.add(getSlotFromCoords(col, row));
          }
        }
      }
    }
    
    // If too many changes (>200), do full redraw
    const shouldFullRedraw = changedSlots.size > 200 || changedSlots.size === 0;
    
    if (shouldFullRedraw) {
      // Full redraw
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }

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

    // Render slots (only changed slots if doing partial redraw)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slotId = getSlotFromCoords(col, row);
        
        // Skip unchanged slots during partial redraw
        if (!shouldFullRedraw && !changedSlots.has(slotId)) continue;
        
        const x = col * slotWidth;
        const y = row * slotHeight;

        const isOccupied = occupiedSlots.has(slotId);
        const isSelected = selectedSlots.has(slotId) || dragSelection?.has(slotId);
        const isHovered = hoveredSlot === slotId;

        // Clear this slot's area for partial redraws
        if (!shouldFullRedraw) {
          ctx.fillStyle = '#141414';
          ctx.fillRect(x, y, slotWidth, slotHeight);
        }

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
    
    // Update previous state
    prevStateRef.current = {
      hoveredSlot,
      selectedSlots: new Set(selectedSlots),
      occupiedSlots: new Set(occupiedSlots),
      isDragging,
      dragStart,
      dragEnd
    };

    // Draw drag selection rectangle outline
    if (isDragging && dragStart && dragEnd) {
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);

      const x = minCol * slotWidth;
      const y = minRow * slotHeight;
      const width = (maxCol - minCol + 1) * slotWidth;
      const height = (maxRow - minRow + 1) * slotHeight;

      ctx.strokeStyle = 'rgba(168, 85, 247, 1)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }, [dimensions, occupiedSlots, selectedSlots, isDragging, dragStart, dragEnd, hoveredSlot, slotWidth, slotHeight, getSlotFromCoords]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordsFromEvent(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStart(coords);
    setDragEnd(coords);
  };

  // Handle mouse move with RAF throttling
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Throttle using requestAnimationFrame
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      const coords = getCoordsFromEvent(e);
      if (!coords) {
        setHoveredSlot(null);
        rafRef.current = undefined;
        return;
      }

      setHoveredSlot(getSlotFromCoords(coords.col, coords.row));

      if (isDragging) {
        setDragEnd(coords);
      }
      
      rafRef.current = undefined;
    });
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  // Handle click (single click for occupied slots, toggle selection for empty)
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordsFromEvent(e);
    if (!coords) return;

    const slotId = getSlotFromCoords(coords.col, coords.row);
    
    // If occupied, open video viewer immediately
    if (occupiedSlots.has(slotId) && videos[slotId]) {
      onVideoView(slotId, videos[slotId]);
    } else {
      // For empty slots, toggle selection
      onSlotClick(slotId);
    }
  };

  // Handle double click (legacy support, can be same as click)
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
      style={{ cursor: isDragging ? 'crosshair' : 'default' }}
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
          setHoveredSlot(null);
          // Cancel any pending RAF
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = undefined;
          }
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full"
      />
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CanvasVideoGrid, (prevProps, nextProps) => {
  return (
    prevProps.videos === nextProps.videos &&
    prevProps.occupiedSlots === nextProps.occupiedSlots &&
    prevProps.selectedSlots === nextProps.selectedSlots &&
    prevProps.onSlotClick === nextProps.onSlotClick &&
    prevProps.onVideoView === nextProps.onVideoView &&
    prevProps.onSelectionChange === nextProps.onSelectionChange
  );
});
