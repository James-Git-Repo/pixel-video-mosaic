import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, DollarSign, Shield } from 'lucide-react';

const Terms: React.FC = () => {
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
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Terms & Conditions</h1>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using The Million Slots AI Billboard ("the Service"), you accept and agree 
                to be bound by the terms and provision of this agreement. If you do not agree to abide by 
                the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-500" />
                2. Payment & Pricing
              </h2>
              <ul className="space-y-2">
                <li>• Each slot costs $0.50 USD</li>
                <li>• Payments are processed securely through Stripe</li>
                <li>• All prices are in USD unless otherwise specified</li>
                <li>• Payment is required before content upload</li>
                <li>• Prices may change with 30 days notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-500" />
                3. Display Duration & Slot Management
              </h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="mb-4"><strong>Video Duration Limits:</strong></p>
                <ul className="space-y-1">
                  <li>• Base duration: 15 seconds for single slot</li>
                  <li>• Additional time: +5 seconds per additional slot</li>
                  <li>• Maximum duration: 150 seconds (2.5 minutes)</li>
                  <li>• File size limit: 250 MB</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Content Requirements</h2>
              <p className="mb-4">
                By uploading content, you acknowledge and agree that:
              </p>
              <ul className="space-y-2">
                <li>• All content must be AI-generated</li>
                <li>• You have the right to use and display the content</li>
                <li>• Content does not infringe on any third-party rights</li>
                <li>• Content complies with our Content Policy</li>
                <li>• You grant us a non-exclusive license to display your content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Content Approval Process</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">Approval</h3>
                  <p className="text-sm">Content meeting our guidelines will be approved and displayed on the billboard.</p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-red-700 dark:text-red-400">Rejection</h3>
                  <p className="text-sm">Content violating our policies will be rejected with a full refund via the original payment method.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Refund Policy</h2>
              <ul className="space-y-2">
                <li>• Full refunds for rejected content</li>
                <li>• No refunds for approved and displayed content</li>
                <li>• Refunds processed within 5-10 business days</li>
                <li>• Chargebacks may result in account suspension</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-500" />
                7. Intellectual Property
              </h2>
              <p className="mb-4">
                The Million Slots AI Billboard platform, design, and original content are protected by 
                intellectual property laws. User-uploaded AI-generated content remains the property of 
                the uploader, with a license granted to us for display purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p>
                The service is provided "as is" without warranties. We are not liable for any indirect, 
                incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your access to the service at our sole 
                discretion, without notice, for conduct that we believe violates these Terms or is 
                harmful to other users of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will provide notice of 
                significant changes. Continued use of the service after changes constitutes acceptance 
                of the new terms.
              </p>
            </section>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Contact Information</h3>
              <p className="text-sm">
                For questions about these Terms & Conditions, contact us at legal@millionslotsai.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;