
import React, { useState } from 'react';
import { Search, Play, X } from 'lucide-react';

interface SlotSelectorProps {
  videos: { [slotId: string]: string };
  onClose: () => void;
}

const SlotSelector: React.FC<SlotSelectorProps> = ({ videos, onClose }) => {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [searchSlot, setSearchSlot] = useState('');

  const handleSlotSearch = () => {
    if (searchSlot.trim()) {
      setSelectedSlot(searchSlot.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSlotSearch();
    }
  };

  const selectedVideo = selectedSlot ? videos[selectedSlot] : null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold sparkle-text">Slot Viewer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Slot Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Enter Slot Coordinates (e.g., 100-250)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchSlot}
                onChange={(e) => setSearchSlot(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="row-column (e.g., 100-250)"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSlotSearch}
                className="px-4 py-2 sparkle-bg text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Display */}
          {selectedSlot && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Viewing slot:</span>
                <span className="font-mono text-sm sparkle-text">{selectedSlot}</span>
              </div>
              
              <div className="border border-border rounded-lg overflow-hidden">
                {selectedVideo ? (
                  <div className="relative aspect-video bg-muted">
                    <video
                      className="w-full h-full object-cover"
                      src={selectedVideo}
                      controls
                      autoPlay
                      loop
                      muted
                    />
                    <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                      Slot {selectedSlot}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="w-16 h-16 border-2 border-border rounded-lg mb-2 mx-auto"></div>
                      <p>No video in slot {selectedSlot}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Videos Info */}
          <div className="text-sm text-muted-foreground">
            <p>Total videos uploaded: {Object.keys(videos).length}</p>
            {Object.keys(videos).length > 0 && (
              <div className="mt-2">
                <p>Available slots with videos:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.keys(videos).slice(0, 10).map(slotId => (
                    <button
                      key={slotId}
                      onClick={() => setSelectedSlot(slotId)}
                      className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-xs font-mono transition-colors"
                    >
                      {slotId}
                    </button>
                  ))}
                  {Object.keys(videos).length > 10 && (
                    <span className="px-2 py-1 text-xs">
                      +{Object.keys(videos).length - 10} more...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotSelector;
