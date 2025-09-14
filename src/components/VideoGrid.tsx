import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';
import { useIsAdmin } from '../hooks/useIsAdmin';

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
const SLOT_SIZE = 0.8; // Smaller slots to fit entire grid in view

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
  const [zoom] = useState(0.8);
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

  return (
    <div className="w-full h-full bg-background">
      <Grid
        columnCount={GRID_SIZE}
        columnWidth={SLOT_SIZE * zoom}
        height={dimensions.height}
        rowCount={GRID_SIZE}
        rowHeight={SLOT_SIZE * zoom}
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