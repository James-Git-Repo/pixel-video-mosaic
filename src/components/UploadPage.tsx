import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const UploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [submission, setSubmission] = useState<any>(null);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [durationValid, setDurationValid] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      fetchSubmissionFromSession();
    }
  }, [sessionId]);

  const fetchSubmissionFromSession = async () => {
    try {
      // Get submission details from Stripe session
      const { data, error } = await supabase.functions.invoke('get-submission-from-session', {
        body: { sessionId }
      });

      if (error) throw error;
      
      // Check if submission is paid and ready for upload
      if (data.submission.status !== 'paid' || data.submission.video_asset_id) {
        toast({
          title: "Invalid submission state",
          description: "This submission is not ready for upload",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      setSubmission(data.submission);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load your submission details",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const calculateMaxDuration = (slotCount: number): number => {
    return Math.min(150, 15 + 5 * (slotCount - 1));
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mov', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload .mp4, .mov, or .webm files only",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (250MB)
    if (file.size > 250 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video file must be under 250MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedVideo(file);
    const videoUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(videoUrl);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && submission) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      
              const slotCount = submission.slots ? submission.slots.length : submission.slot_count || 1;
              const maxDuration = calculateMaxDuration(slotCount);
              setDurationValid(duration <= maxDuration);

              if (duration > maxDuration) {
                toast({
                  title: "Video too long",
                  description: `Video must be ${maxDuration} seconds or less for ${slotCount} slot${slotCount !== 1 ? 's' : ''}`,
                  variant: "destructive",
                });
              }

      // Generate poster at 1s mark
      generatePoster();
    }
  };

  const generatePoster = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    videoRef.current.currentTime = 1; // 1 second mark
    videoRef.current.onseeked = () => {
      canvas.width = videoRef.current!.videoWidth;
      canvas.height = videoRef.current!.videoHeight;
      ctx.drawImage(videoRef.current!, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const posterUrl = URL.createObjectURL(blob);
          setPoster(posterUrl);
        }
      }, 'image/jpeg', 0.8);
    };
  };

  const handleSubmit = async () => {
    if (!uploadedVideo || !submission || !durationValid || !policyAgreed) {
      toast({
        title: "Cannot upload",
        description: "Please select a valid video file and agree to the policies",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload videos",
          variant: "destructive",
        });
        return;
      }

      // Get file extension
      const fileExtension = uploadedVideo.name.split('.').pop()?.toLowerCase() || 'mp4';
      
      // Upload video to private videos bucket with structured path
      const videoPath = `${user.id}/original/${submission.id}.${fileExtension}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(videoPath, uploadedVideo);

      if (uploadError) throw uploadError;

      // Upload poster if available
      let posterUrl = null;
      if (poster) {
        const posterBlob = await fetch(poster).then(r => r.blob());
        const posterPath = `${user.id}/posters/${submission.id}.jpg`;
        const { data: posterUploadData, error: posterUploadError } = await supabase.storage
          .from('videos')
          .upload(posterPath, posterBlob);

        if (!posterUploadError) {
          const { data: { publicUrl: posterPublicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(posterPath);
          posterUrl = posterPublicUrl;
        }
      }

      // Update submission with video details and status
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({
          video_filename: videoPath,
          poster_url: posterUrl,
          duration_seconds: Math.round(videoDuration),
          status: 'under_review',
          video_asset_id: submission.id // Mark as having uploaded content
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast({
        title: "Upload successful",
        description: "Your video has been uploaded and is now under review",
      });

      navigate('/');

    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your submission...</p>
        </div>
      </div>
    );
  }

  const slotCount = submission.slots ? submission.slots.length : submission.slot_count || 1;
  const maxDuration = calculateMaxDuration(slotCount);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Upload Your Video</h1>
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Submission Details */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-2">Submission Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Slots</div>
                <div className="font-medium">{slotCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Max Duration</div>
                <div className="font-medium">{maxDuration}s</div>
              </div>
                <div>
                  <div className="text-muted-foreground">Amount Paid</div>
                  <div className="font-medium">${(submission.amount_cents / 100).toFixed(2)} {submission.currency}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">Awaiting Upload</div>
                </div>
            </div>
          </div>

          {/* Promo Code Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Have a promo code?</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Policy Agreement */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="policyAgree"
                  checked={policyAgreed}
                  onChange={(e) => setPolicyAgreed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="policyAgree" className="text-sm">
                  I confirm that my content is AI-generated and I agree to the{' '}
                  <a href="/content-policy" target="_blank" className="text-primary hover:underline">
                    Content Policy
                  </a>,{' '}
                  <a href="/terms" target="_blank" className="text-primary hover:underline">
                    Terms & Conditions
                  </a>, and{' '}
                  <a href="/refund-policy" target="_blank" className="text-primary hover:underline">
                    Refund Policy
                  </a>.
                </label>
              </div>
            </div>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Video File (.mp4, .mov, .webm • Max 250MB • Max {maxDuration}s)
              </label>
              <div 
                onClick={handleFileSelect}
                className="border-2 border-dashed border-primary rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/80 hover:bg-primary/5"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploadedVideo ? uploadedVideo.name : 'Click to upload video'}
                </p>
              </div>
            </div>

            {uploadedVideoUrl && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Preview</label>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full aspect-video object-cover"
                      src={uploadedVideoUrl}
                      controls
                      muted
                      onLoadedMetadata={handleVideoLoadedMetadata}
                    />
                  </div>
                </div>

                {videoDuration > 0 && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    durationValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {durationValid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      Duration: {Math.round(videoDuration)}s / {maxDuration}s max
                    </span>
                  </div>
                )}

                {poster && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Generated Poster</label>
                    <img 
                      src={poster} 
                      alt="Video poster" 
                      className="w-32 h-20 object-cover rounded border border-border"
                    />
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Upload Requirements</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• File format: .mp4, .mov, or .webm only</li>
                    <li>• File size: Maximum 250MB</li>
                    <li>• Duration: Maximum {maxDuration} seconds for {slotCount} slot{slotCount !== 1 ? 's' : ''}</li>
                    <li>• Content: Must be AI-generated</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!uploadedVideo || !durationValid || isUploading || !policyAgreed}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit Video for Review
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;