import React, { useState, useRef } from 'react';
import { Upload, X, Plus, Minus, CreditCard, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserUploadPopupProps {
  onClose: () => void;
  occupiedSlots: Set<string>;
  onSlotsUpdated: () => void;
  preSelectedSlots?: string[];
}

const UserUploadPopup: React.FC<UserUploadPopupProps> = ({ 
  onClose, 
  occupiedSlots, 
  onSlotsUpdated,
  preSelectedSlots = []
}) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>(preSelectedSlots);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [currentSlotInput, setCurrentSlotInput] = useState('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSlotInput = (value: string) => {
    // Format as row-column if user enters just numbers
    let formattedValue = value;
    if (value.includes(',')) {
      formattedValue = value.replace(',', '-');
    }
    setCurrentSlotInput(formattedValue);
  };

  const addSlot = () => {
    if (currentSlotInput.includes('-') && currentSlotInput.split('-').length === 2) {
      const [row, col] = currentSlotInput.split('-').map(n => parseInt(n));
      if (row >= 0 && row < 1000 && col >= 0 && col < 1000) {
        if (occupiedSlots.has(currentSlotInput)) {
          toast({
            title: "Slot already occupied",
            description: `Slot ${currentSlotInput} is already taken. Please choose another slot.`,
            variant: "destructive",
          });
          return;
        }
        if (!selectedSlots.includes(currentSlotInput)) {
          setSelectedSlots(prev => [...prev, currentSlotInput]);
        }
        setCurrentSlotInput('');
      } else {
        toast({
          title: "Invalid slot coordinates",
          description: "Row and column must be between 0-999",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid format",
        description: "Please use format: row-column (e.g., 100-250)",
        variant: "destructive",
      });
    }
  };

  const removeSlot = (slotToRemove: string) => {
    setSelectedSlots(prev => prev.filter(slot => slot !== slotToRemove));
  };

  const calculateTotal = () => {
    return selectedSlots.length * 0.50; // $0.50 USD per slot
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "File too large",
          description: "Video file must be under 100MB",
          variant: "destructive",
        });
        return;
      }
      setUploadedVideo(file);
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideoUrl(videoUrl);
    }
  };

  const handleSubmit = async () => {
    if (!email || !uploadedVideo || selectedSlots.length === 0) {
      toast({
        title: "Missing information",
        description: "Please provide email, select slots, and upload a video",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Upload video to Supabase Storage
      const fileName = `user_${Date.now()}_${uploadedVideo.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(fileName, uploadedVideo);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(fileName);

      // Create submission record
      const { data: submission, error: submissionError } = await supabase
        .from('video_submissions')
        .insert({
          email: email,
          slots: selectedSlots,
          amount_paid: calculateTotal() * 100, // Convert to cents
          payment_intent_id: `pending_${Date.now()}`, // Temporary - will be updated with actual Stripe payment
          video_url: publicUrl,
          video_filename: fileName,
          status: 'pending_payment'
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Create Stripe checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          slots: selectedSlots,
          email: email,
          videoUrl: publicUrl,
          videoFilename: fileName,
          submissionId: submission.id
        }
      });

      if (checkoutError) throw checkoutError;

      // Redirect to Stripe checkout
      window.location.href = checkoutData.url;

    } catch (error) {
      console.error('Error creating submission:', error);
      toast({
        title: "Submission failed",
        description: "There was an error creating your submission",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasValidData = email && uploadedVideo && selectedSlots.length > 0;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold sparkle-text">Purchase Video Slots</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Slot Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Video Slots ($0.50 USD each)</label>
              <div className="text-sm text-muted-foreground">
                Total: ${calculateTotal().toFixed(2)} USD
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={currentSlotInput}
                onChange={(e) => handleSlotInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSlot()}
                placeholder="row-column (e.g., 100-250)"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={addSlot}
                disabled={!currentSlotInput.includes('-')}
                className="flex items-center gap-2 px-3 py-2 sparkle-bg text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {selectedSlots.length > 0 && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">Selected Slots ({selectedSlots.length}) - ${calculateTotal().toFixed(2)}</h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {selectedSlots.map((slotId) => (
                    <div key={slotId} className="flex items-center gap-2 bg-accent/20 px-2 py-1 rounded">
                      <span className="text-sm">Slot {slotId}</span>
                      <button
                        onClick={() => removeSlot(slotId)}
                        className="text-accent hover:text-accent/80"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video Upload */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Upload Video (Max 100MB)</label>
            <div 
              onClick={handleFileSelect}
              className="border-2 border-dashed border-primary rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/80 hover:bg-primary/5"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadedVideo ? uploadedVideo.name : 'Click to upload video'}
              </p>
            </div>

            {uploadedVideoUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <video
                    className="w-full aspect-video object-cover"
                    src={uploadedVideoUrl}
                    controls
                    muted
                  />
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Updated Payment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Payment & Review Process</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Secure payment processing via Stripe</li>
                  <li>• Videos are subject to admin approval before going live</li>
                  <li>• You'll receive email notifications about your submission status</li>
                  <li>• Inappropriate content will be rejected with full refund</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!hasValidData || isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            {isProcessing ? 'Processing...' : `Pay $${calculateTotal().toFixed(2)} with Stripe`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserUploadPopup;
