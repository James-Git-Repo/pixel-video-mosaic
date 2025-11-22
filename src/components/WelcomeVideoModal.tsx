
import React from 'react';
import { X, Play, Sparkles } from 'lucide-react';

interface WelcomeVideoModalProps {
  onClose: () => void;
  welcomeVideo?: string;
  isAdmin: boolean;
  onVideoUpload: (file: File) => void;
  alwaysShow?: boolean;
  onToggleAlwaysShow?: () => void;
}

const WelcomeVideoModal: React.FC<WelcomeVideoModalProps> = ({ 
  onClose, 
  welcomeVideo, 
  isAdmin, 
  onVideoUpload,
  alwaysShow = false,
  onToggleAlwaysShow
}) => {
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold sparkle-text">Welcome to The Million Slots AI Billboard</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {onToggleAlwaysShow && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="alwaysShow"
              checked={alwaysShow}
              onChange={onToggleAlwaysShow}
            />
            <label htmlFor="alwaysShow" className="text-muted-foreground">
              Always show welcome video
            </label>
          </div>
        )}

        <div className="space-y-6">
          {welcomeVideo ? (
            <div className="border border-border rounded-lg overflow-hidden bg-black">
              <video
                className="w-full aspect-video object-cover"
                src={welcomeVideo}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center border border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <Play className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg">Welcome Video Coming Soon</p>
                <p className="text-sm">The admin will upload an introduction video here</p>
              </div>
            </div>
          )}

          {/* AI-Generated Content Requirement */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Content Requirement</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">All content must be AI-generated!</strong> This is our only requirement - whether it's AI-created videos, animations, art, music, or any other form of digital content. As long as it's generated using artificial intelligence, it's welcome on our billboard.
            </p>
          </div>

          {isAdmin && (
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Admin: Upload Welcome Video</h4>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This video will be shown to all visitors when they first enter the site
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-muted-foreground">
              Explore 1,000,000 interactive video slots • Click on the grid to view videos • Search for specific slots
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeVideoModal;
