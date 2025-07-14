
import React, { useState, useRef } from 'react';
import { Upload, X, Play, Plus, Minus } from 'lucide-react';

interface AdminUploadPopupProps {
  onClose: () => void;
  onVideoUpload: (slotId: string, file: File) => void;
}

const AdminUploadPopup: React.FC<AdminUploadPopupProps> = ({ onClose, onVideoUpload }) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [currentSlotInput, setCurrentSlotInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSlotInput = (value: string) => {
    // Format as row-column if user enters just numbers
    let formattedValue = value;
    if (value.includes(',')) {
      formattedValue = value.replace(',', '-');
    }
    setCurrentSlotInput(formattedValue);
  };

  const addSlot = () => {
    if (currentSlotInput.includes('-') && currentSlotInput.split('-').length === 2) {
      const [row, col] = currentSlotInput.split('-').map(n => parseInt(n));
      if (row >= 0 && row < 1000 && col >= 0 && col < 1000) {
        if (!selectedSlots.includes(currentSlotInput)) {
          setSelectedSlots(prev => [...prev, currentSlotInput]);
        }
        setCurrentSlotInput('');
      }
    }
  };

  const removeSlot = (slotToRemove: string) => {
    setSelectedSlots(prev => prev.filter(slot => slot !== slotToRemove));
  };

  const calculateMaxDuration = () => {
    if (selectedSlots.length === 0) return 15;
    return Math.min(15 + (selectedSlots.length - 1) * 5, 150); // Max 2.5 minutes (150 seconds)
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/') && selectedSlots.length > 0) {
      // Create preview
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
      
      // Upload the video to all selected slots
      selectedSlots.forEach(slotId => {
        onVideoUpload(slotId, file);
      });
    }
  };

  const maxDuration = calculateMaxDuration();
  const hasValidSlots = selectedSlots.length > 0;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold sparkle-text">Multi-Slot Video Upload</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Slot Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Video Slots</label>
              <div className="text-sm text-muted-foreground">
                Max Duration: {maxDuration}s ({Math.floor(maxDuration / 60)}:{(maxDuration % 60).toString().padStart(2, '0')})
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={currentSlotInput}
                onChange={(e) => handleSlotInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSlot()}
                placeholder="row-column (e.g., 100-250)"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={addSlot}
                disabled={!currentSlotInput.includes('-')}
                className="flex items-center gap-2 px-3 py-2 sparkle-bg text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {selectedSlots.length > 0 && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">Selected Slots ({selectedSlots.length})</h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {selectedSlots.map((slotId) => (
                    <div key={slotId} className="flex items-center gap-2 bg-accent/20 px-2 py-1 rounded">
                      <span className="text-sm">Slot {slotId}</span>
                      <button
                        onClick={() => removeSlot(slotId)}
                        className="text-accent hover:text-accent/80"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Video will span {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} • 
                  Duration: 15s base + {selectedSlots.length > 1 ? `${(selectedSlots.length - 1) * 5}s` : '0s'} = {maxDuration}s
                </div>
              </div>
            )}
          </div>

          {/* Video Upload */}
          <div className="space-y-4">
            <div 
              onClick={handleFileSelect}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                hasValidSlots 
                  ? 'border-primary hover:border-primary/80 hover:bg-primary/5' 
                  : 'border-border cursor-not-allowed opacity-50'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {hasValidSlots 
                  ? `Click to upload video (max ${maxDuration} seconds for ${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''})`
                  : 'Select at least one slot first'
                }
              </p>
            </div>

            {uploadedVideo && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <video
                    className="w-full aspect-video object-cover"
                    src={uploadedVideo}
                    controls
                    muted
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Play className="w-4 h-4" />
                  <span>Video uploaded to {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={!hasValidSlots}
          />

          {/* Instructions */}
          <div className="bg-muted rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">Multi-Slot Upload Instructions:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Add slot coordinates one by one (0-999 for both row and column)</li>
              <li>• Video duration increases with slot count: 15s base + 5s per additional slot</li>
              <li>• Maximum duration: 2.5 minutes (150 seconds)</li>
              <li>• Video will be uploaded to all selected slots simultaneously</li>
              <li>• Supported formats: MP4, WebM, MOV</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadPopup;
