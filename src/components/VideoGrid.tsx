import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';
import { Slider } from './ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

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
  const [zoom, setZoom] = useState(1);
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

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    const gridElement = gridRef.current?._outerRef;
    if (gridElement) {
      gridElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => gridElement.removeEventListener('wheel', handleWheel);
    }
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

  const slotSize = BASE_SLOT_SIZE * zoom;

  return (
    <div 
      className="w-full h-full bg-background relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'crosshair' : 'default' }}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-3 min-w-[200px]">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={0.1}
            max={5}
            step={0.1}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground min-w-[40px]">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      <Grid
        ref={gridRef}
        columnCount={GRID_SIZE}
        columnWidth={slotSize}
        height={dimensions.height}
        rowCount={GRID_SIZE}
        rowHeight={slotSize}
        width={dimensions.width}
        overscanRowCount={10}
        overscanColumnCount={10}
      >
        {Cell}
      </Grid>
    </div>
  );
};

export default VideoGrid;