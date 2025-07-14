
import React, { useState } from 'react';
import { X, Play, Plus, Minus, Merge } from 'lucide-react';

interface VideoMergerProps {
  videos: { [slotId: string]: string };
  onClose: () => void;
  onMerge: (mergedVideo: string, slotIds: string[]) => void;
}

const VideoMerger: React.FC<VideoMergerProps> = ({ videos, onClose, onMerge }) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const availableVideos = Object.entries(videos);

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlots(prev => 
      prev.includes(slotId) 
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const calculateDuration = (slotCount: number) => {
    // Base 15 seconds + 5 seconds per additional slot
    return Math.min(15 + (slotCount - 1) * 5, 150); // Max 2.5 minutes (150 seconds)
  };

  const handleMerge = async () => {
    if (selectedSlots.length < 2) return;

    setIsProcessing(true);
    
    try {
      // Create a simple merged video URL (in real implementation, you'd use video processing)
      // For now, we'll use the first video as the merged result
      const mergedVideoUrl = videos[selectedSlots[0]];
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onMerge(mergedVideoUrl, selectedSlots);
    } catch (error) {
      console.error('Error merging videos:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const duration = calculateDuration(selectedSlots.length);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold sparkle-text">Video Merger</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-medium mb-2">Merge Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Selected Slots:</span>
                <span className="ml-2 font-medium">{selectedSlots.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium">{duration}s</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Duration:</span>
                <span className="ml-2 font-medium">150s (2.5min)</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-4">Available Videos ({availableVideos.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {availableVideos.map(([slotId, videoUrl]) => (
                <div
                  key={slotId}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedSlots.includes(slotId)
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-primary'
                  }`}
                  onClick={() => toggleSlotSelection(slotId)}
                >
                  <div className="aspect-video bg-muted rounded mb-2 overflow-hidden">
                    <video
                      className="w-full h-full object-cover"
                      src={videoUrl}
                      muted
                      loop
                    />
                  </div>
                  <p className="text-sm font-medium">Slot {slotId}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">15s base</span>
                    {selectedSlots.includes(slotId) && (
                      <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-xs text-accent-foreground font-bold">
                          {selectedSlots.indexOf(slotId) + 1}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedSlots.length > 0 && (
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Merge Preview</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Videos will be combined in selection order with {duration} seconds total duration
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.map((slotId, index) => (
                  <div key={slotId} className="flex items-center gap-2 bg-accent/20 px-2 py-1 rounded">
                    <span className="text-sm">Slot {slotId}</span>
                    <button
                      onClick={() => toggleSlotSelection(slotId)}
                      className="text-accent hover:text-accent/80"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Select 2 or more videos to merge • Duration: 15s base + 5s per additional slot
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={selectedSlots.length < 2 || isProcessing}
                className="flex items-center gap-2 px-4 py-2 sparkle-bg text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Merge className="w-4 h-4" />
                    Merge {selectedSlots.length} Videos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoMerger;
