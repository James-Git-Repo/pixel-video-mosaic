import React, { useState, useEffect } from 'react';
import VideoGridInterface from './VideoGridInterface';
import { supabase } from '@/integrations/supabase/client';

const VideoGridWithRealtime: React.FC = () => {
  const [realtimeKey, setRealtimeKey] = useState(0);

  useEffect(() => {
    // Subscribe to video_submissions changes
    const submissionsChannel = supabase
      .channel('video_submissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_submissions'
        },
        (payload) => {
          console.log('Video submission change:', payload);
          // Force re-render by updating key
          setRealtimeKey(prev => prev + 1);
        }
      )
      .subscribe();

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
          // Force re-render by updating key
          setRealtimeKey(prev => prev + 1);
        }
      )
      .subscribe();

    // Subscribe to occupied_slot_items changes
    const occupiedItemsChannel = supabase
      .channel('occupied_slot_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'occupied_slot_items'
        },
        (payload) => {
          console.log('Occupied slot items change:', payload);
          // Force re-render by updating key
          setRealtimeKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(occupiedSlotsChannel);
      supabase.removeChannel(occupiedItemsChannel);
    };
  }, []);

  return <VideoGridInterface key={realtimeKey} />;
};

export default VideoGridWithRealtime;