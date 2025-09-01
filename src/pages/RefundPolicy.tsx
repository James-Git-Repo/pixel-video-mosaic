import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Billboard
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Refund Policy</h1>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none text-card-foreground">
            <p className="text-lg mb-6 text-card-foreground">
              We strive to provide a fair and transparent refund policy for The Million Slots AI Billboard. 
              This policy outlines when refunds are available and how to request them.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Automatic Refunds
              </h2>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="mb-4"><strong>You will receive an automatic full refund if:</strong></p>
                <ul className="space-y-2">
                  <li>✅ Your content is rejected for policy violations</li>
                  <li>✅ Technical issues prevent your content upload</li>
                  <li>✅ System errors occur during the payment process</li>
                  <li>✅ Content fails our AI-verification process</li>
                </ul>
                <p className="mt-4 text-sm">
                  <strong>Processing time:</strong> 5-10 business days to your original payment method
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                No Refunds Available
              </h2>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="mb-4"><strong>Refunds are not available for:</strong></p>
                <ul className="space-y-2">
                  <li>❌ Content that has been successfully uploaded and displayed</li>
                  <li>❌ Change of mind after upload completion</li>
                  <li>❌ Content that has completed its display cycle</li>
                  <li>❌ Purchases made more than 30 days ago</li>
                  <li>❌ Fraudulent or suspicious payment activity</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-500" />
                Refund Timeline
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    Content Review
                  </h3>
                  <p className="text-sm text-muted-foreground">24-48 hours after upload</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Refund Processing
                  </h3>
                  <p className="text-sm text-muted-foreground">5-10 business days</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Bank Processing
                  </h3>
                  <p className="text-sm text-muted-foreground">1-3 additional business days</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    Dispute Resolution
                  </h3>
                  <p className="text-sm text-muted-foreground">Up to 14 business days</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Refund Methods</h2>
              <ul className="space-y-2">
                <li>• <strong>Credit Card:</strong> Refunded to original card (5-10 business days)</li>
                <li>• <strong>PayPal:</strong> Refunded to PayPal account (1-3 business days)</li>
                <li>• <strong>Bank Transfer:</strong> May take up to 10 business days</li>
                <li>• <strong>Digital Wallets:</strong> Varies by provider (1-7 business days)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                Special Circumstances
              </h2>
              <div className="space-y-4">
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-semibold">Content Removal</h3>
                  <p className="text-sm">
                    If approved content is later removed for policy violations discovered post-approval, 
                    refunds will be considered on a case-by-case basis.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold">Platform Issues</h3>
                  <p className="text-sm">
                    If technical issues prevent proper display of your approved content, we may offer 
                    partial refunds or display extensions.
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold">Disputed Charges</h3>
                  <p className="text-sm">
                    Initiating a chargeback instead of contacting us may result in account suspension 
                    and loss of future refund eligibility.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">How to Request a Refund</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                    <div>
                      <strong>Contact Support:</strong> Email admin@millionslotsai.com with your payment details
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                    <div>
                      <strong>Provide Information:</strong> Include transaction ID, email used, and reason for refund
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                    <div>
                      <strong>Wait for Review:</strong> Our team will review your request within 2 business days
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
                    <div>
                      <strong>Receive Response:</strong> You'll be notified of the decision and next steps
                    </div>
                  </li>
                </ol>
              </div>
            </section>

            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-sm mb-3">
                If you have questions about refunds or encounter any issues, our support team is here to help.
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong>Email:</strong> admin@millionslotsai.com</p>
                <p><strong>Response Time:</strong> Within 24 hours</p>
                <p><strong>Available:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;