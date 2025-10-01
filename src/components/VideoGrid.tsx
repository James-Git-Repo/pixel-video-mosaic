import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { Slider } from './ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface VideoData {
  [slotId: string]: string;
}

interface VideoGridProps {
  videos: VideoData;
  occupiedSlots: Set<string>;
  onVideoUpload: (slotId: string, file: File) => void;
  onVideoView: (slotId: string, video: string) => void;
  selectedSlots?: Set<string>;
  onSelectionChange?: (selectedSlots: Set<string>) => void;
  onSlotClick?: (slotId: string) => void;
}

const GRID_SIZE = 1000; // 1000x1000 = 1,000,000 slots
const BASE_SLOT_SIZE = 1; // Base size when zoomed out to see all slots

const VideoGrid: React.FC<VideoGridProps> = ({ 
  videos, 
  occupiedSlots, 
  onVideoUpload, 
  onVideoView, 
  selectedSlots = new Set(),
  onSelectionChange,
  onSlotClick
}) => {
  const { isAdmin } = useIsAdmin();
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const slotId = `${rowIndex}-${columnIndex}`;
    const hasVideo = !!videos[slotId];
    
    return (
      <div style={style}>
        <VideoSlot
          slotId={slotId}
          video={videos[slotId]}
          isOccupied={occupiedSlots.has(slotId)}
          hasVideo={hasVideo}
          isAdmin={isAdmin}
          onVideoUpload={onVideoUpload}
          onVideoView={onVideoView}
          isSelected={selectedSlots.has(slotId)}
          onSlotClick={() => onSlotClick?.(slotId)}
        />
      </div>
    );
  }, [videos, occupiedSlots, onVideoUpload, onVideoView, selectedSlots, onSlotClick, isAdmin]);

  const slotSize = BASE_SLOT_SIZE * zoom;

  return (
    <div className="w-full h-full bg-background relative">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-3 min-w-[200px]">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={1}
            max={50}
            step={1}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground min-w-[40px]">{zoom}x</span>
        </div>
      </div>

      <Grid
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