import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

const PaymentCancelledPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleReturnToGrid = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Your payment was cancelled. No charges were made.
            </p>
            <p className="text-sm text-muted-foreground">
              Your slot selection has been released and is available for others to purchase.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={handleReturnToGrid} className="w-full" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Grid
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>
              You can try selecting slots again. Remember: each slot costs $0.50 USD.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelledPage;