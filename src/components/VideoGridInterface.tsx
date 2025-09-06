import React, { useState, useEffect } from 'react';
import VideoGrid from './VideoGrid';
import AdminLogin from './AdminLogin';
import SlotSelector from './SlotSelector';
import AdminUploadPopup from './AdminUploadPopup';
import VideoViewer from './VideoViewer';
import WelcomeVideoModal from './WelcomeVideoModal';
import UserUploadPopup from './UserUploadPopup';
import AdminPanel from './AdminPanel';
import NavigationDrawer from './NavigationDrawer';
import { Film, Layers, Zap, Settings, LogOut, Eye, Upload, ShoppingCart, Users, X, Sparkles, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VideoGridInterface: React.FC = () => {
  const { isAdmin } = useIsAdmin();
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
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isNavOpen, setIsNavOpen] = useState(false);
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
      setShowAdminPanel(true);
    } else {
      setShowAdminLogin(true);
    }
  };

  const handleLogin = () => {
    setShowAdminLogin(false);
    // Admin status will be checked via database
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

  const handleSelectionChange = (newSelection: Set<string>) => {
    setSelectedSlots(newSelection);
  };

  // Calculate selection dimensions
  const getSelectionDimensions = () => {
    if (selectedSlots.size === 0) return { width: 0, height: 0 };
    
    const slots = Array.from(selectedSlots);
    const coords = slots.map(slot => {
      const [row, col] = slot.split('-').map(Number);
      return { row, col };
    });
    
    const minRow = Math.min(...coords.map(c => c.row));
    const maxRow = Math.max(...coords.map(c => c.row));
    const minCol = Math.min(...coords.map(c => c.col));
    const maxCol = Math.max(...coords.map(c => c.col));
    
    return {
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1
    };
  };

  const handlePurchaseSelected = async () => {
    if (selectedSlots.size === 0) return;
    
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase slots",
        variant: "destructive",
      });
      return;
    }
    
    // Create slot hold first
    const slots = Array.from(selectedSlots);
    const coords = slots.map(slot => {
      const [row, col] = slot.split('-').map(Number);
      return { row, col };
    });
    
    const minRow = Math.min(...coords.map(c => c.row));
    const maxRow = Math.max(...coords.map(c => c.row));
    const minCol = Math.min(...coords.map(c => c.col));
    const maxCol = Math.max(...coords.map(c => c.col));
    
    const top_left = `${minRow}-${minCol}`;
    const bottom_right = `${maxRow}-${maxCol}`;
    
    try {
      // Step 1: Create slot hold
      const { data: holdData, error: holdError } = await supabase.functions.invoke('create-slot-hold', {
        body: { top_left, bottom_right, slot_ids: slots }
      });
      
      if (holdError) {
        if (holdError.message?.includes('SLOT_TAKEN') || holdError.message?.includes('slot_taken')) {
          toast({
            title: "Slots no longer available",
            description: "Some slots were just taken. Please reselect.",
            variant: "destructive",
          });
          setSelectedSlots(new Set());
          return;
        }
        throw holdError;
      }
      
      // Step 2: Create Stripe checkout
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: { hold_id: holdData.hold_id }
      });
      
      if (checkoutError) {
        throw checkoutError;
      }
      
      // Redirect to Stripe checkout
      window.open(checkoutData.url, '_blank');
      
      // Clear selection
      setSelectedSlots(new Set());
      
    } catch (error: any) {
      console.error('Error in purchase flow:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloseVideoViewer = () => {
    setShowVideoViewer(false);
    setCurrentViewedVideo(null);
  };

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col font-futura">
      {/* Header */}
      <header className="header-gradient px-6 py-6 relative">
        <div className="flex items-center justify-between">
          {/* Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNavOpen(true)}
            className="text-foreground hover:bg-primary/20 glow-hover"
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Title */}
          <div className="text-center flex-1 mx-8">
            <h1 className="text-4xl font-cyber font-black neon-text">
              The Million Slots AI Billboard
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-futura">
              1,000,000 video slots • Interactive digital canvas • AI-generated content only
            </p>
          </div>

          {/* Floating Buy Button (for non-admin) */}
          {!isAdmin && (
            <Button
              onClick={handlePurchaseSelected}
              disabled={selectedSlots.size === 0}
              className="cyber-bg text-background font-cyber font-bold px-6 py-3 glow-hover disabled:opacity-30 disabled:cursor-not-allowed shadow-xl border border-neon-cyan/30 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-pink to-neon-blue opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <ShoppingCart className="w-5 h-5 mr-2" />
              <span className="relative z-10">
                Buy {selectedSlots.size || ''} Slot{selectedSlots.size !== 1 ? 's' : ''}
              </span>
            </Button>
          )}
        </div>
      </header>

      {/* Admin Control Bar - Only show if admin */}
      {isAdmin && (
        <div className="bg-card/50 backdrop-blur-sm border-b border-primary/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 neon-bg rounded-lg">
                <Film className="w-6 h-6 text-background" />
              </div>
              <div>
                <h2 className="text-xl font-cyber font-bold text-foreground">Admin Control Panel</h2>
                <p className="text-sm text-muted-foreground font-futura">Upload and manage video content</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowAdminPanel(true)}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-futura glow-hover"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Submissions
              </Button>
              
              <Button
                onClick={() => setShowUploadPopup(true)}
                className="neon-bg text-background font-futura glow-hover"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-primary/20 px-6 py-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground font-futura">
            {isAdmin 
              ? "Upload videos to single or multiple slots simultaneously. Duration auto-adjusts: 15s base + 5s per additional slot (max 2.5 minutes)."
              : "Drag to select rectangular areas. Double-click videos to view or empty slots for info. Each slot costs $0.50 USD."
            }
          </p>
          <div className="flex items-center justify-center gap-2 text-primary font-semibold animate-glow-pulse">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-cyber">All content must be AI-generated!</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>


      {/* Selection Summary Panel */}
      {selectedSlots.size > 0 && !isAdmin && (
        <div className="absolute top-32 right-4 z-20 bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-4 shadow-lg min-w-[280px] glow-hover">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-glow-pulse"></div>
              <h3 className="font-cyber font-semibold text-foreground">Selection Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm font-futura">
              <div>
                <div className="text-muted-foreground">Dimensions</div>
                <div className="font-medium text-accent">{getSelectionDimensions().width}×{getSelectionDimensions().height}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Slots</div>
                <div className="font-medium text-secondary">{selectedSlots.size}</div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-futura">Total Price</span>
                <span className="text-lg font-cyber font-bold text-primary">${(selectedSlots.size * 0.50).toFixed(2)} USD</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-futura">
                $0.50 per slot
              </div>
              
              <Button
                onClick={() => setSelectedSlots(new Set())}
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground hover:text-foreground font-futura"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Selection
              </Button>
            </div>
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
          selectedSlots={selectedSlots}
          onSelectionChange={handleSelectionChange}
        />
      </main>

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onBuySlots={handlePurchaseSelected}
        onManualEntry={() => {
          setShowUserUpload(true);
          setIsNavOpen(false);
        }}
        onSearchSlot={() => {
          setShowSlotSelector(true);
          setIsNavOpen(false);
        }}
        onAdminAccess={() => {
          handleAdminAccess();
          setIsNavOpen(false);
        }}
        selectedSlots={selectedSlots}
      />

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
