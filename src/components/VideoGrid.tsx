
import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';
import { useAdminMode } from '../hooks/useAdminMode';

interface VideoData {
  [slotId: string]: string;
}

interface VideoGridProps {
  videos: VideoData;
  occupiedSlots: Set<string>;
  onVideoUpload: (slotId: string, file: File) => void;
  onVideoView: (slotId: string, video: string) => void;
}

const GRID_SIZE = 1000; // 1000x1000 = 1,000,000 slots
const SLOT_SIZE = 10; // 10x10 pixels per slot

const VideoGrid: React.FC<VideoGridProps> = ({ videos, occupiedSlots, onVideoUpload, onVideoView }) => {
  const [zoom, setZoom] = useState(1);
  const { isAdmin } = useAdminMode();

  const handleVideoUpload = useCallback((slotId: string, file: File) => {
    if (!isAdmin) return; // Only allow uploads if admin
    onVideoUpload(slotId, file);
    console.log(`Video uploaded to slot ${slotId}`);
  }, [isAdmin, onVideoUpload]);

  const handleVideoView = useCallback((slotId: string, video: string) => {
    onVideoView(slotId, video);
  }, [onVideoView]);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const slotId = `${rowIndex}-${columnIndex}`;
    const isOccupied = occupiedSlots.has(slotId);
    
    return (
      <div style={style}>
        <VideoSlot
          slotId={slotId}
          onVideoUpload={handleVideoUpload}
          onVideoView={handleVideoView}
          video={videos[slotId]}
          isAdmin={isAdmin}
          isOccupied={isOccupied}
        />
      </div>
    );
  }, [videos, occupiedSlots, handleVideoUpload, handleVideoView, isAdmin]);

  const gridWidth = GRID_SIZE * SLOT_SIZE * zoom;
  const gridHeight = GRID_SIZE * SLOT_SIZE * zoom;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Zoom Controls - Only show if admin */}
      {isAdmin && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border">
          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.5, 10))}
            className="px-3 py-1 sparkle-bg text-background rounded text-sm transition-opacity hover:opacity-90"
          >
            Zoom In
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev / 1.5, 0.1))}
            className="px-3 py-1 sparkle-bg text-background rounded text-sm transition-opacity hover:opacity-90"
          >
            Zoom Out
          </button>
          <div className="text-foreground text-xs text-center">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      )}

      {/* Stats - Only show if admin */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-10 bg-card/80 backdrop-blur-sm rounded-lg p-3 text-foreground text-sm border border-border">
          <div>Total Slots: 1,000,000</div>
          <div className="sparkle-text font-medium">Videos Uploaded: {Object.keys(videos).length}</div>
          <div className="text-orange-500">Occupied Slots: {occupiedSlots.size}</div>
          <div>Available: {1000000 - occupiedSlots.size}</div>
        </div>
      )}

      {/* Grid Container */}
      <div 
        className="w-full h-full overflow-auto"
        style={{
          cursor: zoom > 1 ? 'grab' : 'default',
        }}
      >
        <Grid
          columnCount={GRID_SIZE}
          columnWidth={SLOT_SIZE * zoom}
          height={window.innerHeight}
          rowCount={GRID_SIZE}
          rowHeight={SLOT_SIZE * zoom}
          width={window.innerWidth}
          overscanRowCount={50}
          overscanColumnCount={50}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
};

export default VideoGrid;
