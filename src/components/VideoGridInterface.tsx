import React, { useState, useEffect } from 'react';
import VideoGrid from './VideoGrid';
import AdminLogin from './AdminLogin';
import SlotSelector from './SlotSelector';
import AdminUploadPopup from './AdminUploadPopup';
import VideoViewer from './VideoViewer';
import WelcomeVideoModal from './WelcomeVideoModal';
import UserUploadPopup from './UserUploadPopup';
import AdminPanel from './AdminPanel';
import { Film, Layers, Zap, Settings, LogOut, Eye, Upload, ShoppingCart, Users, X, Sparkles } from 'lucide-react';
import { useAdminMode } from '../hooks/useAdminMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VideoGridInterface: React.FC = () => {
  const { isAdmin, toggleAdminMode } = useAdminMode();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showUserUpload, setShowUserUpload] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(true);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentViewedVideo, setCurrentViewedVideo] = useState<{slotId: string, video: string} | null>(null);
  const [videos, setVideos] = useState<{ [slotId: string]: string }>({});
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [welcomeVideo, setWelcomeVideo] = useState<string | null>(null);
  const [isSelectingSlots, setIsSelectingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load occupied slots and videos on component mount
  useEffect(() => {
    loadOccupiedSlots();
    loadAdminVideos();
  }, []);

  const loadOccupiedSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('occupied_slots')
        .select('slot_id, video_url');
      
      if (error) throw error;
      
      const slotsSet = new Set<string>();
      const videosMap: { [slotId: string]: string } = {};
      
      data?.forEach(slot => {
        slotsSet.add(slot.slot_id);
        videosMap[slot.slot_id] = slot.video_url;
      });
      
      setOccupiedSlots(slotsSet);
      setVideos(prev => ({ ...prev, ...videosMap }));
    } catch (error) {
      console.error('Error loading occupied slots:', error);
    }
  };

  const loadAdminVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_videos')
        .select('slot_id, video_url');
      
      if (error) throw error;
      
      const adminVideosMap: { [slotId: string]: string } = {};
      data?.forEach(video => {
        adminVideosMap[video.slot_id] = video.video_url;
      });
      
      setVideos(prev => ({ ...prev, ...adminVideosMap }));
    } catch (error) {
      console.error('Error loading admin videos:', error);
    }
  };

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

  const handleVideoUpload = async (slotId: string, file: File) => {
    if (!isAdmin) return;
    
    try {
      // Upload file to Supabase Storage
      const fileName = `admin_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(fileName);

      // Save to admin_videos table
      const { error: dbError } = await supabase
        .from('admin_videos')
        .upsert({
          slot_id: slotId,
          video_url: publicUrl,
          uploaded_by: 'admin'
        });

      if (dbError) throw dbError;

      // Update local state
      setVideos(prev => ({
        ...prev,
        [slotId]: publicUrl
      }));

      toast({
        title: "Video uploaded successfully",
        description: `Video has been uploaded to slot ${slotId}`,
      });

      console.log(`Admin video uploaded to slot ${slotId}`);
    } catch (error) {
      console.error('Error uploading admin video:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading the video",
        variant: "destructive",
      });
    }
  };

  const handleWelcomeVideoUpload = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setWelcomeVideo(videoUrl);
  };

  const handleVideoView = (slotId: string, video: string) => {
    setCurrentViewedVideo({ slotId, video });
    setShowVideoViewer(true);
  };

  const handleSlotSelect = (slotId: string) => {
    if (isAdmin) return;
    
    setSelectedSlots(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(slotId)) {
        newSelected.delete(slotId);
      } else {
        if (occupiedSlots.has(slotId) || videos[slotId]) {
          toast({
            title: "Slot unavailable",
            description: "This slot is already occupied. Please select an empty slot.",
            variant: "destructive",
          });
          return prev;
        }
        newSelected.add(slotId);
      }
      return newSelected;
    });
  };

  const handleStartSelection = () => {
    setIsSelectingSlots(true);
    setSelectedSlots(new Set());
  };

  const handleCancelSelection = () => {
    setIsSelectingSlots(false);
    setSelectedSlots(new Set());
  };

  const handlePurchaseSelected = () => {
    if (selectedSlots.size === 0) return;
    setShowUserUpload(true);
    setIsSelectingSlots(false);
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
                  <span>Multi-Slot Upload</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                Manage Submissions
              </button>
              
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
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20 px-6 py-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground">
            {isAdmin 
              ? "Upload videos to single or multiple slots simultaneously. Duration auto-adjusts: 15s base + 5s per additional slot (max 2.5 minutes)."
              : "Single-click empty slots to select. Double-click any video to view. Each slot costs $0.50."
            }
          </p>
          <div className="flex items-center justify-center gap-2 text-primary font-semibold">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">All content must be AI-generated!</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Controls for non-admin users */}
      {!isAdmin && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={handlePurchaseSelected}
            disabled={selectedSlots.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy {selectedSlots.size} Slot{selectedSlots.size !== 1 ? 's' : ''} (${(selectedSlots.size * 0.5).toFixed(2)})
          </button>
          {selectedSlots.size > 0 && (
            <button
              onClick={() => setSelectedSlots(new Set())}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
          <button
            onClick={() => setShowUserUpload(true)}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Manual Entry
          </button>
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

      {/* Selection Status Bar */}
      {selectedSlots.size > 0 && !isAdmin && (
        <div className="absolute top-20 right-4 z-20 bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="text-sm">
            <div className="font-medium">Slot Selection Mode</div>
            <div className="text-muted-foreground">
              Selected: {selectedSlots.size} slot{selectedSlots.size !== 1 ? 's' : ''}
            </div>
            {selectedSlots.size > 0 && (
              <div className="text-primary font-medium">
                Total: ${(selectedSlots.size * 0.5).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <main className="flex-1 relative">
        <VideoGrid 
          videos={videos}
          occupiedSlots={occupiedSlots}
          onVideoUpload={handleVideoUpload}
          onVideoView={handleVideoView}
          isSelectingSlots={isSelectingSlots}
          selectedSlots={selectedSlots}
          onSlotSelect={handleSlotSelect}
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

      {showUserUpload && !isAdmin && (
        <UserUploadPopup
          onClose={() => {
            setShowUserUpload(false);
            setSelectedSlots(new Set());
          }}
          occupiedSlots={occupiedSlots}
          onSlotsUpdated={loadOccupiedSlots}
          preSelectedSlots={Array.from(selectedSlots)}
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

      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
};

export default VideoGridInterface;
