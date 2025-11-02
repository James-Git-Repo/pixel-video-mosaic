
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, ArrowLeft, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [isProcessing, setIsProcessing] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'processing' | 'success' | 'failed'>('processing');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerificationStatus('failed');
        setIsProcessing(false);
        return;
      }

      // If it's a free code session, just mark as success
      if (sessionId.startsWith('free_')) {
        localStorage.removeItem('msb:selected');
        setVerificationStatus('success');
        setIsProcessing(false);
        return;
      }

      try {
        // Call verify-payment edge function to confirm with Stripe
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        if (data?.verified) {
          localStorage.removeItem('msb:selected');
          setVerificationStatus('success');
          toast.success('Payment verified successfully!');
        } else {
          setVerificationStatus('failed');
          toast.error('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationStatus('failed');
        toast.error('Failed to verify payment');
      } finally {
        setIsProcessing(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (isProcessing || verificationStatus === 'processing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <h2 className="text-lg font-semibold mb-2">Verifying your payment...</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we confirm your purchase with Stripe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'failed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              We couldn't verify your payment. This could be a temporary issue.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Billboard
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If you were charged, please contact support with session ID: {sessionId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Billboard
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Payment Successful</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center p-8">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Received!</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-lg">Your slots are now yours!</p>
              <p className="text-muted-foreground">
                {sessionId?.startsWith('free_') 
                  ? 'Your free slots have been activated using the discount code.'
                  : 'Thank you for your purchase. Your payment has been processed successfully.'
                }
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                You can now upload or assign videos to your purchased slots. Visit the billboard to get started.
              </p>
            </div>

            <div className="space-y-3">
              <Link to="/" className="block">
                <Button className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload/Assign Video
                </Button>
              </Link>
              
              <Link to="/" className="block">
                <Button variant="outline" className="w-full">
                  View My Slots
                </Button>
              </Link>
            </div>

            <div className="text-xs text-muted-foreground">
              Session ID: {sessionId}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentSuccessPage;
