
import React, { useState, useRef } from 'react';
import { Upload, X, Play } from 'lucide-react';

interface AdminUploadPopupProps {
  onClose: () => void;
  onVideoUpload: (slotId: string, file: File) => void;
}

const AdminUploadPopup: React.FC<AdminUploadPopupProps> = ({ onClose, onVideoUpload }) => {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSlotInput = (value: string) => {
    // Format as row-column if user enters just numbers
    let formattedValue = value;
    if (value.includes(',')) {
      formattedValue = value.replace(',', '-');
    }
    setSelectedSlot(formattedValue);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/') && selectedSlot) {
      // Create preview
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
      
      // Upload the video
      onVideoUpload(selectedSlot, file);
    }
  };

  const isSlotValid = selectedSlot.includes('-') && selectedSlot.split('-').length === 2;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold sparkle-text">Upload Video to Slot</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Slot Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Slot Coordinates</label>
            <input
              type="text"
              value={selectedSlot}
              onChange={(e) => handleSlotInput(e.target.value)}
              placeholder="row-column (e.g., 100-250)"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Enter coordinates like "100-250" (row-column format)
            </p>
          </div>

          {/* Video Upload */}
          <div className="space-y-4">
            <div 
              onClick={handleFileSelect}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isSlotValid 
                  ? 'border-primary hover:border-primary/80 hover:bg-primary/5' 
                  : 'border-border cursor-not-allowed opacity-50'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isSlotValid ? 'Click to upload video (max 15 seconds)' : 'Enter valid slot coordinates first'}
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
                  <span>Video uploaded to slot {selectedSlot}</span>
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
            disabled={!isSlotValid}
          />

          {/* Instructions */}
          <div className="bg-muted rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">Upload Instructions:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Enter slot coordinates (0-999 for both row and column)</li>
              <li>• Videos must be max 15 seconds long</li>
              <li>• Supported formats: MP4, WebM, MOV</li>
              <li>• Videos will loop automatically on the grid</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadPopup;
