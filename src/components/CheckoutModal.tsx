import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlots: string[];
  onCheckoutSuccess: () => void;
}

interface PricingData {
  slot_1y: number;
  slot_permanent: number;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedSlots,
  onCheckoutSuccess
}) => {
  const [term, setTerm] = useState<'1y' | 'permanent'>('1y');
  const [discountCode, setDiscountCode] = useState('');
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const loadPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('key, amount_cents')
        .in('key', ['slot_1y', 'slot_permanent']);

      if (error) throw error;

      const pricingMap = data.reduce((acc, item) => {
        acc[item.key as keyof PricingData] = item.amount_cents;
        return acc;
      }, {} as PricingData);

      setPricing(pricingMap);
    } catch (error) {
      console.error('Error loading pricing:', error);
      toast({
        title: "Error loading pricing",
        description: "Could not load pricing information",
        variant: "destructive",
      });
    }
  };

  const calculateTotal = () => {
    if (!pricing) return 0;
    
    const pricePerSlot = pricing[`slot_${term}`] || 0;
    let total = pricePerSlot * selectedSlots.length;
    
    // Apply discount
    if (discountCode === "xfgkqwhe9pèàlDòIJ2+QR0EI2") {
      total = 0;
    }
    
    return total;
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          slotIds: selectedSlots,
          term,
          discountCode: discountCode.trim() || undefined
        }
      });

      if (error) {
        if (error.message?.includes('unavailable')) {
          setError("Some slots are no longer available. Please reselect your slots.");
          return;
        }
        throw error;
      }

      // Redirect to checkout
      if (data?.url) {
        window.open(data.url, '_blank');
        onCheckoutSuccess();
        onClose();
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      setError(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = calculateTotal();
  const isFree = totalAmount === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Purchase Slots
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Selection Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Selection Summary</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Selected slots:</span>
                <span className="font-medium">{selectedSlots.length}</span>
              </div>
            </div>
          </div>

          {/* Term Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Display Term</Label>
            <RadioGroup value={term} onValueChange={(value) => setTerm(value as '1y' | 'permanent')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1y" id="1y" />
                <Label htmlFor="1y" className="flex-1">
                  <div className="flex justify-between">
                    <span>1 Year</span>
                    <span className="font-medium">
                      ${pricing ? ((pricing.slot_1y || 0) / 100).toFixed(2) : '0.00'} per slot
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent" className="flex-1">
                  <div className="flex justify-between">
                    <span>Permanent</span>
                    <span className="font-medium">
                      ${pricing ? ((pricing.slot_permanent || 0) / 100).toFixed(2) : '0.00'} per slot
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Discount Code */}
          <div className="space-y-2">
            <Label htmlFor="discount-code">Discount Code (Optional)</Label>
            <Input
              id="discount-code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Enter discount code"
            />
            {discountCode === "xfgkqwhe9pèàlDòIJ2+QR0EI2" && (
              <div className="text-sm text-green-600 font-medium">
                ✓ Free code applied!
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${(totalAmount / 100).toFixed(2)} USD
                </div>
                {isFree && (
                  <div className="text-sm text-green-600 font-medium">
                    FREE with discount code
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={isLoading || !pricing}
              className="flex-1"
            >
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isFree ? "Get Free Slots" : "Proceed to Checkout"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;