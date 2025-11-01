import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';

interface VideoData {
  [slotId: string]: string;
}

interface VideoGridProps {
  videos: VideoData;
  occupiedSlots: Set<string>;
  onVideoView: (slotId: string, video: string) => void;
  selectedSlots?: Set<string>;
  onSelectionChange?: (selectedSlots: Set<string>) => void;
  onSlotClick?: (slotId: string) => void;
}

const GRID_SIZE = 100; // 100x100 = 10,000 slots

const VideoGrid: React.FC<VideoGridProps> = ({ 
  videos, 
  occupiedSlots,
  onVideoView, 
  selectedSlots = new Set(),
  onSelectionChange,
  onSlotClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<any>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!gridRef.current) return;
    
    // Get the grid element's position
    const gridElement = gridRef.current._outerRef;
    const rect = gridElement.getBoundingClientRect();
    
    // Calculate position relative to the grid
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / slotSize);
    const row = Math.floor(y / slotSize);
    
    // Ensure we're within bounds
    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      setIsDragging(true);
      setDragStart({ row, col });
      setDragEnd({ row, col });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !gridRef.current) return;
    
    // Get the grid element's position
    const gridElement = gridRef.current._outerRef;
    const rect = gridElement.getBoundingClientRect();
    
    // Calculate position relative to the grid
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x / slotSize)));
    const row = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y / slotSize)));
    
    setDragEnd({ row, col });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }

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

  // Compute drag selection area
  const dragSelection = useMemo(() => {
    if (!isDragging || !dragStart || !dragEnd) return null;
    
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);
    
    return { minRow, maxRow, minCol, maxCol };
  }, [isDragging, dragStart, dragEnd]);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const slotId = `${rowIndex}-${columnIndex}`;
    const hasVideo = !!videos[slotId];
    
    // Check if this slot is in the drag selection
    let isInDragSelection = false;
    if (dragSelection) {
      isInDragSelection = rowIndex >= dragSelection.minRow && 
                         rowIndex <= dragSelection.maxRow && 
                         columnIndex >= dragSelection.minCol && 
                         columnIndex <= dragSelection.maxCol &&
                         !occupiedSlots.has(slotId);
    }
    
    return (
      <div style={style}>
        <VideoSlot
          slotId={slotId}
          video={videos[slotId]}
          isOccupied={occupiedSlots.has(slotId)}
          hasVideo={hasVideo}
          isAdmin={false}
          onVideoUpload={() => {}}
          onVideoView={onVideoView}
          isSelected={selectedSlots.has(slotId) || isInDragSelection}
          onSlotClick={() => onSlotClick?.(slotId)}
        />
      </div>
    );
  }, [videos, occupiedSlots, onVideoView, selectedSlots, onSlotClick, dragSelection]);

  // Calculate slot size to fit entire grid on screen
  const slotSize = Math.min(dimensions.width / GRID_SIZE, dimensions.height / GRID_SIZE);
  const gridWidth = GRID_SIZE * slotSize;
  const gridHeight = GRID_SIZE * slotSize;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-background relative flex items-center justify-center overflow-hidden"
      style={{ cursor: isDragging ? 'crosshair' : 'default' }}
    >
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Grid
          ref={gridRef}
          columnCount={GRID_SIZE}
          columnWidth={slotSize}
          height={gridHeight}
          rowCount={GRID_SIZE}
          rowHeight={slotSize}
          width={gridWidth}
          overscanRowCount={5}
          overscanColumnCount={5}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
};

export default VideoGrid;