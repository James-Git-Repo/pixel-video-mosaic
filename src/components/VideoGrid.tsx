
import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';

interface VideoData {
  [slotId: string]: string;
}

const GRID_SIZE = 1000; // 1000x1000 = 1,000,000 slots
const SLOT_SIZE = 10; // 10x10 pixels per slot

const VideoGrid: React.FC = () => {
  const [videos, setVideos] = useState<VideoData>({});
  const [zoom, setZoom] = useState(1);

  const handleVideoUpload = useCallback((slotId: string, file: File) => {
    // Create object URL for the uploaded video
    const videoUrl = URL.createObjectURL(file);
    setVideos(prev => ({
      ...prev,
      [slotId]: videoUrl
    }));
    console.log(`Video uploaded to slot ${slotId}`);
  }, []);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const slotId = `${rowIndex}-${columnIndex}`;
    
    return (
      <div style={style}>
        <VideoSlot
          slotId={slotId}
          onVideoUpload={handleVideoUpload}
          video={videos[slotId]}
        />
      </div>
    );
  }, [videos, handleVideoUpload]);

  const gridWidth = GRID_SIZE * SLOT_SIZE * zoom;
  const gridHeight = GRID_SIZE * SLOT_SIZE * zoom;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.5, 10))}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
        >
          Zoom In
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev / 1.5, 0.1))}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
        >
          Zoom Out
        </button>
        <div className="text-white text-xs text-center">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div>Total Slots: 1,000,000</div>
        <div>Videos Uploaded: {Object.keys(videos).length}</div>
        <div>Available: {1000000 - Object.keys(videos).length}</div>
      </div>

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
