
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface VideoSlotProps {
  slotId: string;
  onVideoUpload: (slotId: string, file: File) => void;
  video?: string;
  isAdmin: boolean;
}

const VideoSlot: React.FC<VideoSlotProps> = ({ slotId, onVideoUpload, video, isAdmin }) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isAdmin && !video) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/') && isAdmin) {
      // Check if video is max 15 seconds (this would need server-side validation in production)
      onVideoUpload(slotId, file);
    }
  };

  return (
    <div
      className={`relative w-[10px] h-[10px] border transition-all duration-200 ${
        video 
          ? 'border-accent/30' 
          : isAdmin 
            ? 'border-border cursor-pointer hover:border-primary hover:shadow-sm' 
            : 'border-border/20'
      }`}
      onMouseEnter={() => isAdmin && setIsHovered(true)}
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
        <div className={`w-full h-full bg-muted flex items-center justify-center ${
          isAdmin && isHovered ? 'bg-muted/70' : ''
        }`}>
          {isAdmin && isHovered && (
            <Upload className="w-1 h-1 text-primary" style={{ fontSize: '2px' }} />
          )}
        </div>
      )}
      
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
};

export default VideoSlot;
