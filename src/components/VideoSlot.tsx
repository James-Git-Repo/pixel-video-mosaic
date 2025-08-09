
import React, { useState, useRef } from 'react';
import { Upload, Lock } from 'lucide-react';

interface VideoSlotProps {
  slotId: string;
  onVideoUpload: (slotId: string, file: File) => void;
  onVideoView: (slotId: string, video: string) => void;
  video?: string;
  isAdmin: boolean;
  isOccupied: boolean;
  isSelectingSlots?: boolean;
  isSelected?: boolean;
  onSlotSelect?: (slotId: string) => void;
}

const VideoSlot: React.FC<VideoSlotProps> = ({ 
  slotId, 
  onVideoUpload, 
  onVideoView, 
  video, 
  isAdmin, 
  isOccupied,
  isSelectingSlots = false,
  isSelected = false,
  onSlotSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const handleClick = () => {
    // Single click behavior
    if (isAdmin) {
      if (!video) {
        // Admins can click to upload when slot is empty
        fileInputRef.current?.click();
      }
      return;
    }

    // Customers: single-click selects only empty, available slots
    const canSelect = !video && !isOccupied && onSlotSelect;
    if (canSelect) {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      clickTimeoutRef.current = window.setTimeout(() => {
        onSlotSelect?.(slotId);
        clickTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleDoubleClick = () => {
    // Double click opens the video for customers
    if (!isAdmin && video) {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      onVideoView(slotId, video);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/') && isAdmin) {
      onVideoUpload(slotId, file);
    }
  };

  const getBorderStyle = () => {
    if (isSelected) {
      return 'border-primary border-2 bg-primary/20 cursor-pointer';
    } else if (video) {
      return 'border-accent/30 cursor-pointer hover:border-accent';
    } else if (isOccupied && !isAdmin) {
      return 'border-orange-400/50 bg-orange-100/20';
    } else if (!isAdmin && !video && !isOccupied) {
      return 'border-primary/50 cursor-pointer hover:border-primary hover:bg-primary/10';
    } else if (isAdmin) {
      return 'border-border cursor-pointer hover:border-primary hover:shadow-sm';
    } else {
      return 'border-border/20';
    }
  };

  return (
    <div
      className={`relative w-[10px] h-[10px] border transition-all duration-200 ${getBorderStyle()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
        } ${isOccupied && !isAdmin ? 'bg-orange-100/30' : ''}`}>
          {isOccupied && !isAdmin && isHovered ? (
            <Lock className="w-1 h-1 text-orange-500" style={{ fontSize: '2px' }} />
          ) : isAdmin && isHovered ? (
            <Upload className="w-1 h-1 text-primary" style={{ fontSize: '2px' }} />
          ) : null}
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
