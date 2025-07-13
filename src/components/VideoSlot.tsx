
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface VideoSlotProps {
  slotId: string;
  onVideoUpload: (slotId: string, file: File) => void;
  video?: string;
}

const VideoSlot: React.FC<VideoSlotProps> = ({ slotId, onVideoUpload, video }) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      // Check if video is max 15 seconds (this would need server-side validation in production)
      onVideoUpload(slotId, file);
    }
  };

  return (
    <div
      className="relative w-[10px] h-[10px] border border-gray-800 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {video ? (
        <video
          className="w-full h-full object-cover"
          src={video}
          muted
          loop
          autoPlay
          playsInline
        />
      ) : (
        <div className={`w-full h-full bg-gray-900 flex items-center justify-center ${isHovered ? 'bg-gray-800' : ''}`}>
          {isHovered && (
            <Upload className="w-1 h-1 text-blue-400" style={{ fontSize: '2px' }} />
          )}
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default VideoSlot;
