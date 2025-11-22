import React, { useState, useEffect, lazy, Suspense } from 'react';
import CanvasVideoGrid from './CanvasVideoGrid';
import NavigationDrawer from './NavigationDrawer';
import { ShoppingCart, X, Sparkles, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlotSelection } from '../hooks/useSlotSelection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Lazy load modal components for better performance
const SlotSelector = lazy(() => import('./SlotSelector'));
const VideoViewer = lazy(() => import('./VideoViewer'));
const WelcomeVideoModal = lazy(() => import('./WelcomeVideoModal'));
const UserUploadPopup = lazy(() => import('./UserUploadPopup'));

const VideoGridInterface: React.FC = () => {
  const { selectedSlots, toggleSlot, clearSelection, selectionCount } = useSlotSelection();
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [showUserUpload, setShowUserUpload] = useState(false);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(true);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentViewedVideo, setCurrentViewedVideo] = useState<{slotId: string, video: string} | null>(null);
  const [videos, setVideos] = useState<{ [slotId: string]: string }>({});
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [welcomeVideo, setWelcomeVideo] = useState<string | null>('/intro-video.mp4');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { toast } = useToast();

  // Load occupied slots and videos on component mount
  useEffect(() => {
    loadOccupiedSlots();
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
      setVideos(videosMap);
    } catch (error) {
      console.error('Error loading occupied slots:', error);
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

  const handleSlotClick = (slotId: string) => {
    toggleSlot(slotId);
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

  const handlePurchaseSelected = () => {
    if (selectedSlots.size === 0) return;
    setShowUserUpload(true);
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

          {/* Floating Buy Button */}
          <Button
            onClick={handlePurchaseSelected}
            disabled={selectionCount === 0}
            className="cyber-bg text-background font-cyber font-bold px-6 py-3 glow-hover disabled:opacity-30 disabled:cursor-not-allowed shadow-xl border border-neon-cyan/30 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-pink to-neon-blue opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span className="relative z-10">
              Buy {selectionCount || ''} Slot{selectionCount !== 1 ? 's' : ''}
            </span>
          </Button>
        </div>
      </header>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-primary/20 px-6 py-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground font-futura">
            Drag to select rectangular areas. Double-click videos to view or empty slots for info. Each slot costs $0.50 USD.
          </p>
          <div className="flex items-center justify-center gap-2 text-primary font-semibold animate-glow-pulse">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-cyber">All content must be AI-generated!</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Selection Summary Panel */}
      {selectionCount > 0 && (
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
                <div className="font-medium text-secondary">{selectionCount}</div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-futura">Starting Price</span>
                <span className="text-lg font-cyber font-bold text-primary">${(selectionCount * 0.50).toFixed(2)} USD</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-futura">
                From $0.50 per slot (1-year term)
              </div>
              
              <Button
                onClick={clearSelection}
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
      <main className="flex-1 relative overflow-hidden">
        <CanvasVideoGrid
          videos={videos}
          occupiedSlots={occupiedSlots}
          onVideoView={handleVideoView}
          selectedSlots={selectedSlots}
          onSelectionChange={(newSelection) => {
            // Update the selection in the hook
            for (const slotId of newSelection) {
              if (!selectedSlots.has(slotId)) {
                toggleSlot(slotId);
              }
            }
            // Remove slots that are no longer selected
            for (const slotId of selectedSlots) {
              if (!newSelection.has(slotId)) {
                toggleSlot(slotId);
              }
            }
          }}
          onSlotClick={handleSlotClick}
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
        selectedSlots={selectedSlots}
      />

      {/* Modals - Lazy loaded with Suspense for better performance */}
      <Suspense fallback={null}>
        {showSlotSelector && (
          <SlotSelector 
            videos={videos}
            onClose={() => setShowSlotSelector(false)}
          />
        )}

        {showUserUpload && (
          <UserUploadPopup
            onClose={() => {
              setShowUserUpload(false);
              clearSelection();
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
            isAdmin={false}
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
      </Suspense>
    </div>
  );
};

export default VideoGridInterface;
