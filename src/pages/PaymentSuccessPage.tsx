
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Clear any stored selection data
    localStorage.removeItem('msb:selected');
    
    // Simulate processing time
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <h2 className="text-lg font-semibold mb-2">Processing your payment...</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we confirm your slot purchase.
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
