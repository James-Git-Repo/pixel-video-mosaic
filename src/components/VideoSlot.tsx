
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface VideoSlotProps {
  slotId: string;
  onVideoUpload: (slotId: string, file: File) => void;
  onVideoView: (slotId: string, video: string) => void;
  video?: string;
  isAdmin: boolean;
}

const VideoSlot: React.FC<VideoSlotProps> = ({ slotId, onVideoUpload, onVideoView, video, isAdmin }) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (video && !isAdmin) {
      // Viewers can click to view the video
      onVideoView(slotId, video);
    } else if (isAdmin && !video) {
      // Admins can click to upload
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/') && isAdmin) {
      onVideoUpload(slotId, file);
    }
  };

  return (
    <div
      className={`relative w-[10px] h-[10px] border transition-all duration-200 ${
        video 
          ? 'border-accent/30 cursor-pointer hover:border-accent' 
          : isAdmin 
            ? 'border-border cursor-pointer hover:border-primary hover:shadow-sm' 
            : 'border-border/20'
      }`}
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
