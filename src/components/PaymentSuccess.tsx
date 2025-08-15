
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const sessionId = searchParams.get('session_id');
  const submissionId = searchParams.get('submission_id');

  useEffect(() => {
    if (sessionId && submissionId) {
      verifyPayment();
    }
  }, [sessionId, submissionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId, submissionId }
      });

      if (error) throw error;
      
      if (data.success) {
        setVerified(true);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
        {verifying ? (
          <div className="space-y-4">
            <Loader className="w-12 h-12 mx-auto animate-spin text-primary" />
            <h2 className="text-xl font-bold">Verifying Payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </div>
        ) : verified ? (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <h2 className="text-xl font-bold text-green-600">Payment Successful!</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>Your payment has been confirmed.</p>
              <p>You can now upload your video for review.</p>
            </div>
            <a 
              href={`/upload?session_id=${sessionId}`}
              className="inline-block mt-6 px-6 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors"
            >
              Upload Video
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-600">Payment Verification Failed</h2>
            <p className="text-muted-foreground">
              We couldn't verify your payment. Please contact support if you believe this is an error.
            </p>
            <a 
              href="/"
              className="inline-block mt-6 px-6 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors"
            >
              Return to Homepage
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
