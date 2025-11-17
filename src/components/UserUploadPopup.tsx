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
  const [linkedUrl, setLinkedUrl] = useState('');
  const [currentSlotInput, setCurrentSlotInput] = useState('');
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
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
    // Server will validate promo code and determine final price
    // Client should not know if code is valid
    return selectedSlots.length * 0.50; // $0.50 USD per slot
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
      // Calculate bounding box from selected slots
      const rows = selectedSlots.map(s => parseInt(s.split('-')[0]));
      const cols = selectedSlots.map(s => parseInt(s.split('-')[1]));
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);
      
      const topLeft = `${minRow}-${minCol}`;
      const bottomRight = `${maxRow}-${maxCol}`;

      // Create slot hold with email (no authentication needed)
      const { data, error } = await supabase.functions.invoke('create-slot-hold', {
        body: {
          email: email,
          top_left: topLeft,
          bottom_right: bottomRight,
          slot_ids: selectedSlots,
          expires_minutes: 15
        }
      });

      if (error || !data || !data.hold_id) {
        console.error('Hold creation failed:', error);
        throw new Error(error?.message || 'Failed to reserve slots');
      }

      // If promo code provided, try free checkout
      if (promoCode.trim()) {
        const { data: freeData, error: freeError } = await supabase.functions.invoke('free-checkout', {
          body: {
            email: email,
            hold_id: data.hold_id,
            promo_code: promoCode.trim(),
            linked_url: linkedUrl || null
          }
        });

        // If free checkout succeeds, redirect to upload
        if (!freeError && freeData?.free_checkout) {
          toast({
            title: "Free submission created!",
            description: "Redirecting to upload page...",
          });
          window.location.href = `/upload?submission_id=${freeData.submission_id}`;
          return;
        }
        
        // If promo code invalid, fall through to regular checkout
        console.log('Promo code invalid, proceeding with paid checkout');
      }

      // Regular paid checkout via Stripe
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          hold_id: data.hold_id,
          email: email,
          linked_url: linkedUrl || null
        }
      });

      if (checkoutError || !checkoutData || !checkoutData.url) {
        throw new Error('Failed to create checkout');
      }

      // Redirect to Stripe checkout
      window.location.href = checkoutData.url;

    } catch (error: any) {
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

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link to URL (Optional)</label>
            <input
              type="url"
              value={linkedUrl}
              onChange={(e) => setLinkedUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Add a clickable link to your video slot</p>
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
                <h4 className="font-medium mb-2">
                  Selected Slots ({selectedSlots.length}) - {calculateTotal() === 0 ? 'FREE with promo code!' : `$${calculateTotal().toFixed(2)}`}
                </h4>
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
            <label className="text-sm font-medium">Upload Video (.mp4, .mov, .webm • Max 250MB)</label>
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
            accept=".mp4,.mov,.webm"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Updated Payment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Payment & Upload Process</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Secure payment processing via Stripe</li>
                  <li>• Upload your video after payment confirmation</li>
                  <li>• Videos go live immediately after upload</li>
                  <li>• All content must be AI-generated</li>
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
