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
    <div className="w-full h-screen bg-background text-foreground flex flex-col font-futura relative overflow-hidden">
      {/* Atmospheric background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Header */}
      <header className="header-gradient px-6 py-8 relative z-10">
        <div className="flex items-center justify-between">
          {/* Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNavOpen(true)}
            className="text-foreground hover:bg-primary/30 glow-hover neon-border"
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Title */}
          <div className="text-center flex-1 mx-8">
            <h1 className="text-5xl font-cyber font-black neon-text mb-2">
              The Million Slots AI Billboard
            </h1>
            <p className="text-base text-muted-foreground mt-2 font-futura flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse"></span>
              1,000,000 video slots • Interactive digital canvas
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            </p>
          </div>

          {/* Floating Buy Button */}
          <Button
            onClick={handlePurchaseSelected}
            disabled={selectionCount === 0}
            className="cyber-bg text-foreground font-cyber font-bold px-8 py-4 text-lg glow-hover disabled:opacity-20 disabled:cursor-not-allowed neon-border-cyan relative overflow-hidden group"
          >
            <ShoppingCart className="w-6 h-6 mr-2 relative z-10" />
            <span className="relative z-10">
              Buy {selectionCount || ''} Slot{selectionCount !== 1 ? 's' : ''}
            </span>
          </Button>
        </div>
      </header>

      {/* Instructions */}
      <div className="relative z-10 border-b border-primary/30 px-6 py-5" style={{ 
        background: 'linear-gradient(90deg, hsl(var(--neon-purple) / 0.1) 0%, hsl(var(--neon-pink) / 0.15) 50%, hsl(var(--neon-cyan) / 0.1) 100%)'
      }}>
        <div className="text-center space-y-3">
          <p className="text-base text-foreground/90 font-futura">
            Drag to select rectangular areas. Double-click videos to view or empty slots for info. Each slot costs $1.00 USD.
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full neon-border bg-primary/5">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-base font-cyber font-bold sparkle-text">All content must be AI-generated!</span>
              <Sparkles className="w-5 h-5 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
          </div>
        </div>
      </div>

      {/* Selection Summary Panel */}
      {selectionCount > 0 && (
        <div className="absolute top-36 right-6 z-20 bg-card/95 backdrop-blur-xl neon-border rounded-xl p-5 shadow-lg min-w-[300px] glow-hover animate-scale-in">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full animate-glow-pulse shadow-lg"></div>
              <h3 className="font-cyber font-bold text-lg sparkle-text">Selection Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm font-futura">
              <div className="bg-primary/5 rounded-lg p-3 neon-border">
                <div className="text-muted-foreground text-xs mb-1">Dimensions</div>
                <div className="font-bold text-xl text-accent">{getSelectionDimensions().width}×{getSelectionDimensions().height}</div>
              </div>
              <div className="bg-secondary/5 rounded-lg p-3 neon-border">
                <div className="text-muted-foreground text-xs mb-1">Total Slots</div>
                <div className="font-bold text-xl text-secondary">{selectionCount}</div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground font-futura">Total Price</span>
                <span className="text-2xl font-cyber font-black sparkle-text">${(selectionCount * 1.00).toFixed(2)}</span>
              </div>
              <div className="text-xs text-center text-muted-foreground font-futura bg-accent/5 rounded px-2 py-1">
                $1.00 per slot • 1-year term
              </div>
              
              <Button
                onClick={clearSelection}
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground hover:text-foreground hover:bg-primary/10 font-futura neon-border"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <main className="flex-1 relative overflow-hidden floor-glow">
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
