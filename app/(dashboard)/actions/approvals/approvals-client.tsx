'use client'

import { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AIAction } from '@/lib/types/iq';

interface ApprovalsClientProps {
  pendingActions: AIAction[];
  completedActions: AIAction[];
}

export default function ApprovalsClient({
  pendingActions: initialPending,
  completedActions,
}: ApprovalsClientProps) {
  const [pending, setPending] = useState(initialPending);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (actionId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/iq/actions/${actionId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.data?.success) {
        toast.success('Action approved and executed');
        setPending(prev => prev.filter(a => a.id !== actionId));
      } else {
        toast.error(data.error || 'Failed to approve action');
      }
    } catch {
      toast.error('Network error approving action');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (actionId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/iq/actions/${actionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Rejected by user' }),
      });
      if (res.ok) {
        toast.success('Action rejected');
        setPending(prev => prev.filter(a => a.id !== actionId));
        setRejectReason('');
      } else {
        toast.error('Failed to reject action');
      }
    } catch {
      toast.error('Network error rejecting action');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1480px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel/60 pb-4">
        <div>
          <h1 className="font-syne-title text-2xl text-cream tracking-tight">
            Approval Inbox
          </h1>
          <p className="font-inter text-xs text-silver mt-0.5">
            Controlled human review for sensitive actions & financial updates
          </p>
        </div>

        <span className="font-mono text-xs text-cream bg-carbon border border-steel px-2.5 py-1 rounded-[2px]">
          {pending.length} ACTIONS PENDING
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Actions Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <h2 className="font-inter font-semibold text-sm text-cream">Pending Approvals Queue</h2>

          {pending.length === 0 ? (
            <div className="bg-carbon border border-steel rounded-[2px] p-8 text-center space-y-1.5 shadow-2xs">
              <ShieldCheck size={28} className="mx-auto text-positive" />
              <p className="font-inter font-semibold text-sm text-cream">Approval queue is empty</p>
              <p className="font-inter text-xs text-pewter">
                All proposed AI actions have been resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((action) => (
                <div key={action.id} className="bg-carbon border border-steel rounded-[2px] p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] uppercase font-semibold text-warning bg-warning/10 px-1.5 py-0.2 rounded-[2px]">
                          {action.action_type}
                        </span>
                        {action.action_type === 'vehicle.price_change' && (
                          <span className="font-mono text-[9px] uppercase font-semibold text-negative bg-negative/10 px-1.5 py-0.2 rounded-[2px]">
                            High Commercial Risk
                          </span>
                        )}
                      </div>
                      <h3 className="font-inter font-semibold text-xs text-cream">
                        {action.action_type === 'vehicle.price_change'
                          ? `Reduce asking price to £${action.input_payload?.new_price?.toLocaleString()}`
                          : action.input_payload?.title || 'Proposed Operation'}
                      </h3>
                    </div>

                    <span className="font-mono text-[10px] text-pewter">
                      {new Date(action.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Diff / Parameter Preview */}
                  <div className="p-2.5 bg-asphalt/60 rounded-[2px] border border-steel/60 font-inter text-xs space-y-1">
                    <p className="text-pewter font-mono text-[9px] uppercase tracking-wider">Payload Parameters:</p>
                    <pre className="text-silver font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(action.input_payload, null, 2)}
                    </pre>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-steel/40">
                    <button
                      onClick={() => handleReject(action.id)}
                      disabled={isProcessing}
                      className="px-2.5 py-1 bg-carbon border border-steel text-pewter hover:text-cream text-xs font-inter rounded-[2px] transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(action.id)}
                      disabled={isProcessing}
                      className="px-3.5 py-1 bg-blue text-white hover:bg-blue-dim text-xs font-inter font-medium rounded-[2px] transition-colors cursor-pointer"
                    >
                      Approve & Execute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Resolved History (4 cols) */}
        <div className="lg:col-span-4 bg-carbon border border-steel rounded-[2px] p-4 space-y-3 font-inter text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-steel pb-2">
            <h2 className="font-inter font-semibold text-sm text-cream">Recent History</h2>
            <span className="font-mono text-[9px] text-pewter">{completedActions.length} RECORDED</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {completedActions.map(action => (
              <div key={action.id} className="p-2.5 bg-asphalt/50 border border-steel/50 rounded-[2px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase font-semibold text-silver">
                    {action.action_type}
                  </span>
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-[2px] ${
                    action.status === 'completed' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                  }`}>
                    {action.status}
                  </span>
                </div>
                <p className="text-[11px] text-silver truncate">
                  {action.input_payload?.title || `Price change £${action.input_payload?.new_price || ''}`}
                </p>
                <p className="text-[10px] text-pewter font-mono">
                  {new Date(action.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
