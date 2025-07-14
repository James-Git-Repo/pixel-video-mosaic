
import React from 'react';
import { X } from 'lucide-react';

interface VideoViewerProps {
  slotId: string;
  video: string;
  onClose: () => void;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ slotId, video, onClose }) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold sparkle-text">Slot {slotId}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <video
            className="w-full aspect-video object-cover"
            src={video}
            controls
            autoPlay
            loop
            muted
          />
        </div>

        <div className="mt-4 text-center text-muted-foreground">
          <p>Video from slot coordinates: {slotId}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoViewer;
