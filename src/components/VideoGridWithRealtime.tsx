import React, { useState, useEffect } from 'react';
import VideoGridInterface from './VideoGridInterface';
import { supabase } from '@/integrations/supabase/client';

const VideoGridWithRealtime: React.FC = () => {
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [videos, setVideos] = useState<{ [slotId: string]: string }>({});

  useEffect(() => {
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

  return <VideoGridInterface occupiedSlots={occupiedSlots} videos={videos} />;
};

export default VideoGridWithRealtime;