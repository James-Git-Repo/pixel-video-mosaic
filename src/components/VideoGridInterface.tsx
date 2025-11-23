import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import NavigationDrawer from './NavigationDrawer';
import { ShoppingCart, Sparkles, Menu } from 'lucide-react';

// Lazy load grid and modal components for better performance
const CanvasVideoGrid = lazy(() => import('./CanvasVideoGrid'));
import { Button } from '@/components/ui/button';
import { useSlotSelection } from '../hooks/useSlotSelection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VideoViewer = lazy(() => import('./VideoViewer'));
const WelcomeVideoModal = lazy(() => import('./WelcomeVideoModal'));
const UserUploadPopup = lazy(() => import('./UserUploadPopup'));

interface VideoGridInterfaceProps {
  occupiedSlots?: Set<string>;
  videos?: { [slotId: string]: string };
}

const VideoGridInterface: React.FC<VideoGridInterfaceProps> = ({ 
  occupiedSlots: initialOccupiedSlots, 
  videos: initialVideos 
}) => {
  const { selectedSlots, setSelectedSlots, clearSelection, selectionCount } = useSlotSelection();
  const [showUserUpload, setShowUserUpload] = useState(false);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(true);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentViewedVideo, setCurrentViewedVideo] = useState<{slotId: string, video: string} | null>(null);
  const [videos, setVideos] = useState<{ [slotId: string]: string }>(initialVideos || {});
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(initialOccupiedSlots || new Set());
  const [welcomeVideo, setWelcomeVideo] = useState<string | null>('/intro-video.mp4');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { toast } = useToast();

  // Load occupied slots and videos on component mount (only if not provided via props)
  useEffect(() => {
    if (!initialOccupiedSlots && !initialVideos) {
      loadOccupiedSlots();
    }
  }, []);

  // Update local state when props change (for realtime updates)
  useEffect(() => {
    if (initialOccupiedSlots) {
      setOccupiedSlots(initialOccupiedSlots);
    }
  }, [initialOccupiedSlots]);

  useEffect(() => {
    if (initialVideos) {
      setVideos(initialVideos);
    }
  }, [initialVideos]);

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

  const handleWelcomeVideoUpload = useCallback((file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setWelcomeVideo(videoUrl);
  }, []);
  
  // Cleanup uploaded video URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (welcomeVideo && welcomeVideo !== '/intro-video.mp4') {
        URL.revokeObjectURL(welcomeVideo);
      }
    };
  }, [welcomeVideo]);

  const handleVideoView = useCallback((slotId: string, video: string) => {
    setCurrentViewedVideo({ slotId, video });
    setShowVideoViewer(true);
  }, []);

  const handleSlotClick = useCallback((slotId: string) => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  }, [setSelectedSlots]);

  const handlePurchaseSelected = useCallback(() => {
    if (selectedSlots.size === 0) return;
    setShowUserUpload(true);
  }, [selectedSlots]);

  const handleCloseVideoViewer = useCallback(() => {
    setShowVideoViewer(false);
    setCurrentViewedVideo(null);
  }, []);

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col font-futura relative overflow-hidden">
      {/* Atmospheric background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Header */}
      <header className="header-gradient px-6 py-4 relative z-10">
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
            <h1 className="text-4xl font-cyber font-black neon-text">
              AI Billboard Project
            </h1>
            <p className="text-sm font-cyber text-muted-foreground mt-1">
              Where Art and Advertising come together
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


      {/* Main Grid */}
      <main className="flex-1 relative overflow-hidden floor-glow">
        <div className={showUserUpload ? "pointer-events-none opacity-60" : ""}>
          <Suspense fallback={<GridSkeleton />}>
            <CanvasVideoGrid
              videos={videos}
              occupiedSlots={occupiedSlots}
              onVideoView={handleVideoView}
              selectedSlots={selectedSlots}
              onSelectionChange={(newSelection) => {
                if (showUserUpload) return;
                setSelectedSlots(newSelection);
              }}
              onSlotClick={(slotId) => {
                if (showUserUpload) return;
                handleSlotClick(slotId);
              }}
            />
          </Suspense>
        </div>
      </main>

      {/* Footer with Instructions */}
      <footer className="relative z-10 border-t border-primary/30 px-4 py-2" style={{ 
        background: 'linear-gradient(90deg, hsl(var(--neon-purple) / 0.1) 0%, hsl(var(--neon-pink) / 0.15) 50%, hsl(var(--neon-cyan) / 0.1) 100%)'
      }}>
        <div className="text-center space-y-1.5">
          <p className="text-xs text-foreground/80 font-cyber">
            Drag to select rectangular areas. Click occupied slots to watch videos. Each slot costs $1.00 USD.
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full neon-border bg-primary/5">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-xs font-cyber font-bold sparkle-text">All content must be AI-generated!</span>
              <Sparkles className="w-3 h-3 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
          </div>
        </div>
      </footer>

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onBuySlots={handlePurchaseSelected}
        onManualEntry={() => {
          setShowUserUpload(true);
          setIsNavOpen(false);
        }}
        selectedSlots={selectedSlots}
      />

      {/* Modals - Lazy loaded with Suspense for better performance */}
      <Suspense fallback={null}>
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

// Grid skeleton loading component
const GridSkeleton = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
      <p className="text-muted-foreground font-cyber">Loading grid...</p>
    </div>
  </div>
);

export default VideoGridInterface;
