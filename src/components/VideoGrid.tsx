import React, { useState, useCallback, useRef, useEffect } from 'react';
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
const BASE_SLOT_SIZE = 40; // Base size for slots

const VideoGrid: React.FC<VideoGridProps> = ({ 
  videos, 
  occupiedSlots,
  onVideoView, 
  selectedSlots = new Set(),
  onSelectionChange,
  onSlotClick
}) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<any>(null);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window?.innerWidth || 800,
        height: window?.innerHeight || 600
      });
    };

    // Initial setup
    updateDimensions();
    
    window?.addEventListener('resize', updateDimensions);
    return () => window?.removeEventListener('resize', updateDimensions);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (gridRef.current?.state.scrollLeft || 0);
    const y = e.clientY - rect.top + (gridRef.current?.state.scrollTop || 0);
    
    const col = Math.floor(x / slotSize);
    const row = Math.floor(y / slotSize);
    
    setIsDragging(true);
    setDragStart({ row, col });
    setDragEnd({ row, col });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (gridRef.current?.state.scrollLeft || 0);
    const y = e.clientY - rect.top + (gridRef.current?.state.scrollTop || 0);
    
    const col = Math.floor(x / slotSize);
    const row = Math.floor(y / slotSize);
    
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

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const slotId = `${rowIndex}-${columnIndex}`;
    const hasVideo = !!videos[slotId];
    
    // Check if this slot is in the drag selection
    let isInDragSelection = false;
    if (isDragging && dragStart && dragEnd) {
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);
      
      isInDragSelection = rowIndex >= minRow && rowIndex <= maxRow && 
                         columnIndex >= minCol && columnIndex <= maxCol &&
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
  }, [videos, occupiedSlots, onVideoView, selectedSlots, onSlotClick, isDragging, dragStart, dragEnd]);

  // Calculate slot size to fit entire grid on screen
  const slotSize = Math.min(dimensions.width / GRID_SIZE, dimensions.height / GRID_SIZE);

  return (
    <div 
      className="w-full h-full bg-background relative flex items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'crosshair' : 'default' }}
    >
      <Grid
        ref={gridRef}
        columnCount={GRID_SIZE}
        columnWidth={slotSize}
        height={GRID_SIZE * slotSize}
        rowCount={GRID_SIZE}
        rowHeight={slotSize}
        width={GRID_SIZE * slotSize}
        overscanRowCount={0}
        overscanColumnCount={0}
      >
        {Cell}
      </Grid>
    </div>
  );
};

export default VideoGrid;