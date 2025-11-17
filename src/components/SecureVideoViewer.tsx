import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecureVideoViewerProps {
  slotId: string;
  filePath: string;
  onClose: () => void;
}

const SecureVideoViewer: React.FC<SecureVideoViewerProps> = ({ slotId, filePath, onClose }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        // Get email from localStorage (set during checkout)
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
          throw new Error('Email not found. Please complete checkout again.');
        }

        const { data, error } = await supabase.functions.invoke('get-signed-video-url', {
          body: { filePath, email: userEmail }
        });

        if (error) throw error;

        setVideoUrl(data.signedUrl);
        
        // Analytics: play_started
        console.log('Analytics: play_started', { slotId, filePath });
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [filePath, slotId]);

  const handleVideoEnded = () => {
    // Analytics: play_completed
    console.log('Analytics: play_completed', { slotId, filePath });
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold sparkle-text">Slot {slotId}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {loading && (
            <div className="w-full aspect-video flex items-center justify-center bg-muted">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {error && (
            <div className="w-full aspect-video flex items-center justify-center bg-muted text-destructive">
              {error}
            </div>
          )}
          
          {videoUrl && !loading && !error && (
            <video
              className="w-full aspect-video object-cover"
              src={videoUrl}
              controls
              autoPlay
              loop
              muted
              onEnded={handleVideoEnded}
            />
          )}
        </div>

        <div className="mt-4 text-center text-muted-foreground">
          <p>Video from slot coordinates: {slotId}</p>
        </div>
      </div>
    </div>
  );
};

export default SecureVideoViewer;