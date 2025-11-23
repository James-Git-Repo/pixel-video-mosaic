import React, { useState, useEffect } from 'react';
import VideoGridInterface from './VideoGridInterface';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from './ui/skeleton';

const VideoGridWithRealtime: React.FC = () => {
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [videos, setVideos] = useState<{ [slotId: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial data
    const loadInitialData = async () => {
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
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Subscribe to occupied_slots changes
    const occupiedSlotsChannel = supabase
      .channel('occupied_slots_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'occupied_slots'
        },
        (payload) => {
          console.log('Occupied slots change:', payload);
          
          // Update state based on the event type
          if (payload.eventType === 'INSERT' && payload.new) {
            const newSlot = payload.new as { slot_id: string; video_url: string };
            setOccupiedSlots(prev => new Set(prev).add(newSlot.slot_id));
            setVideos(prev => ({ ...prev, [newSlot.slot_id]: newSlot.video_url }));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldSlot = payload.old as { slot_id: string };
            setOccupiedSlots(prev => {
              const newSet = new Set(prev);
              newSet.delete(oldSlot.slot_id);
              return newSet;
            });
            setVideos(prev => {
              const newVideos = { ...prev };
              delete newVideos[oldSlot.slot_id];
              return newVideos;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedSlot = payload.new as { slot_id: string; video_url: string };
            setOccupiedSlots(prev => new Set(prev).add(updatedSlot.slot_id));
            setVideos(prev => ({ ...prev, [updatedSlot.slot_id]: updatedSlot.video_url }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(occupiedSlotsChannel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-cyber font-bold neon-text">AI Billboard Project</h2>
            <p className="text-muted-foreground font-cyber">Loading the grid...</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    );
  }

  return <VideoGridInterface occupiedSlots={occupiedSlots} videos={videos} />;
};

export default VideoGridWithRealtime;