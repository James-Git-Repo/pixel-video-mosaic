import React, { useState, useEffect } from 'react';
import { X, Check, FileText, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface AdminVideoSubmission {
  id: string;
  email: string;
  top_left: string;
  bottom_right: string;
  width: number;
  height: number;
  slot_count: number;
  amount_cents: number;
  currency: string;
  status: string;
  duration_seconds: number;
  poster_url: string;
  payment_intent_id: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  admin_notes?: string;
}

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [submissions, setSubmissions] = useState<AdminVideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AdminVideoSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_video_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error loading submissions",
        description: "Could not load video submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionAction = async (submissionId: string, action: 'approve' | 'reject' | 'remove') => {
    if (!adminNotes.trim() && (action === 'reject' || action === 'remove')) {
      toast({
        title: "Admin notes required",
        description: `Please provide a reason for ${action}ion`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-submission', {
        body: {
          action,
          submission_id: submissionId,
          reason: adminNotes.trim()
        }
      });

      if (error) throw error;

      toast({
        title: `Submission ${action}d`,
        description: `The video submission has been ${action}d${action !== 'remove' ? ' and the user has been notified' : ''}.`,
      });

      setSelectedSubmission(null);
      setAdminNotes('');
      await loadSubmissions();
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
      toast({
        title: `Error ${action}ing submission`,
        description: `Could not ${action} the submission`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'text-yellow-600 bg-yellow-100';
      case 'under_review':
        return 'text-blue-600 bg-blue-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold sparkle-text">Admin Panel - Video Submissions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Submissions List */}
          <div className="w-1/2 border-r border-border overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium mb-4">Submissions ({submissions.length})</h3>
              
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No submissions found</div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      onClick={() => setSelectedSubmission(submission)}
                      className={`p-3 border border-border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                        selectedSubmission?.id === submission.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(submission.status)}
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(submission.status)}`}>
                            {submission.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">{submission.email}</div>
                        <div className="text-muted-foreground">
                          {submission.slot_count} slot{submission.slot_count > 1 ? 's' : ''} • 
                          ${(submission.amount_cents / 100).toFixed(2)} {submission.currency}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {submission.width}×{submission.height} ({submission.top_left} to {submission.bottom_right})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submission Details */}
          <div className="w-1/2 overflow-y-auto">
            {selectedSubmission ? (
              <div className="p-4">
                <h3 className="font-medium mb-4">Submission Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <div className="text-sm text-muted-foreground">{selectedSubmission.email}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Area ({selectedSubmission.slot_count} slots)</label>
                    <div className="text-sm text-muted-foreground">
                      {selectedSubmission.width}×{selectedSubmission.height} ({selectedSubmission.top_left} to {selectedSubmission.bottom_right})
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Amount Paid</label>
                    <div className="text-sm text-muted-foreground">
                      ${(selectedSubmission.amount_cents / 100).toFixed(2)} {selectedSubmission.currency}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Duration</label>
                    <div className="text-sm text-muted-foreground">{selectedSubmission.duration_seconds}s</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                      {getStatusIcon(selectedSubmission.status)}
                      {selectedSubmission.status.replace('_', ' ')}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Submitted</label>
                    <div className="text-sm text-muted-foreground">
                      {new Date(selectedSubmission.created_at).toLocaleString()}
                    </div>
                  </div>

                  {selectedSubmission.admin_notes && (
                    <div>
                      <label className="text-sm font-medium">Admin Notes</label>
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {selectedSubmission.admin_notes}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.poster_url && (
                    <div>
                      <label className="text-sm font-medium">Video Preview</label>
                      <div className="border border-border rounded-lg overflow-hidden mt-2">
                        <img
                          className="w-full aspect-video object-cover"
                          src={selectedSubmission.poster_url}
                          alt="Video poster"
                        />
                      </div>
                    </div>
                  )}

                  {selectedSubmission.status === 'under_review' && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div>
                        <label className="text-sm font-medium">Admin Notes</label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes about your decision..."
                          className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmissionAction(selectedSubmission.id, 'approve')}
                          disabled={processing}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          {processing ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleSubmissionAction(selectedSubmission.id, 'reject')}
                          disabled={processing}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          {processing ? 'Processing...' : 'Reject & Refund'}
                        </button>
                        <button
                          onClick={() => handleSubmissionAction(selectedSubmission.id, 'remove')}
                          disabled={processing}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          {processing ? 'Processing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a submission to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
