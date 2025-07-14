
import React, { useState, useEffect } from 'react';
import VideoGrid from './VideoGrid';
import AdminLogin from './AdminLogin';
import SlotSelector from './SlotSelector';
import AdminUploadPopup from './AdminUploadPopup';
import VideoViewer from './VideoViewer';
import WelcomeVideoModal from './WelcomeVideoModal';
import { Film, Layers, Zap, Settings, LogOut, Eye, Upload } from 'lucide-react';
import { useAdminMode } from '../hooks/useAdminMode';

const VideoGridInterface: React.FC = () => {
  const { isAdmin, toggleAdminMode } = useAdminMode();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentViewedVideo, setCurrentViewedVideo] = useState<{slotId: string, video: string} | null>(null);
  const [videos, setVideos] = useState<{ [slotId: string]: string }>({});
  const [welcomeVideo, setWelcomeVideo] = useState<string | null>(null);

  // Show welcome video on first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    if (!hasSeenWelcome) {
      setShowWelcomeVideo(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, []);

  const handleAdminAccess = () => {
    if (isAdmin) {
      toggleAdminMode();
    } else {
      setShowAdminLogin(true);
    }
  };

  const handleLogin = () => {
    toggleAdminMode();
    setShowAdminLogin(false);
  };

  const handleVideoUpload = (slotId: string, file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setVideos(prev => ({
      ...prev,
      [slotId]: videoUrl
    }));
    console.log(`Video uploaded to slot ${slotId}`);
  };

  const handleWelcomeVideoUpload = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setWelcomeVideo(videoUrl);
  };

  const handleVideoView = (slotId: string, video: string) => {
    setCurrentViewedVideo({ slotId, video });
    setShowVideoViewer(true);
  };

  const handleCloseVideoViewer = () => {
    setShowVideoViewer(false);
    setCurrentViewedVideo(null);
  };

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      {/* Main Title */}
      <div className="bg-card border-b border-border px-6 py-6">
        <h1 className="text-4xl font-bold text-center sparkle-text">
          The Million Slots AI Billboard
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          1,000,000 video slots • Interactive digital canvas • Click any video to view
        </p>
      </div>

      {/* Admin Header - Only show if admin */}
      {isAdmin && (
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sparkle-bg rounded-lg">
                <Film className="w-6 h-6 text-background" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Control Panel</h2>
                <p className="text-sm text-muted-foreground">Upload and manage video content</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Interactive Mosaic</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span>15s Max Length</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowUploadPopup(true)}
                className="flex items-center gap-2 px-3 py-2 sparkle-bg text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4" />
                Upload Video
              </button>
              
              <button
                onClick={handleAdminAccess}
                className="flex items-center gap-2 px-3 py-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Exit Admin
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Instructions */}
      <div className="bg-muted px-6 py-3 border-b border-border">
        <p className="text-sm text-muted-foreground text-center">
          {isAdmin 
            ? "Click any slot to upload a video (max 15 seconds). Use zoom controls to navigate the massive grid."
            : "Click any video slot to view it, or use the search function to find specific coordinates."
          }
        </p>
      </div>

      {/* Controls for non-admin users */}
      {!isAdmin && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={() => setShowSlotSelector(true)}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Search Slot
          </button>
          <button
            onClick={handleAdminAccess}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Admin
          </button>
        </div>
      )}

      {/* Main Grid */}
      <main className="flex-1 relative">
        <VideoGrid 
          videos={videos}
          onVideoUpload={handleVideoUpload}
          onVideoView={handleVideoView}
        />
      </main>

      {/* Modals */}
      {showAdminLogin && (
        <AdminLogin onLogin={handleLogin} />
      )}

      {showSlotSelector && (
        <SlotSelector 
          videos={videos}
          onClose={() => setShowSlotSelector(false)}
        />
      )}

      {showUploadPopup && isAdmin && (
        <AdminUploadPopup
          onClose={() => setShowUploadPopup(false)}
          onVideoUpload={handleVideoUpload}
        />
      )}

      {showWelcomeVideo && (
        <WelcomeVideoModal
          onClose={() => setShowWelcomeVideo(false)}
          welcomeVideo={welcomeVideo}
          isAdmin={isAdmin}
          onVideoUpload={handleWelcomeVideoUpload}
        />
      )}

      {showVideoViewer && currentViewedVideo && (
        <VideoViewer
          slotId={currentViewedVideo.slotId}
          video={currentViewedVideo.video}
          onClose={handleCloseVideoViewer}
        />
      )}
    </div>
  );
};

export default VideoGridInterface;
