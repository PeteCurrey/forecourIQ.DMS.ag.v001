'use client'

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  X, 
  Clock, 
  Tag, 
  Calendar, 
  UserCheck, 
  AlertTriangle,
  ArrowRight,
  ExternalLink
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
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (actionId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/iq/actions/${actionId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.data?.success) {
        toast.success('Action approved and successfully executed through domain service');
        setPending(prev => prev.filter(a => a.id !== actionId));
        setSelectedAction(null);
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
        setSelectedAction(null);
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
    <div className="max-w-[1520px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-[2px] font-semibold">
              Human Governance
            </span>
            <span className="font-inter text-xs text-pewter">Controlled Action Registry</span>
          </div>
          <h1 className="font-syne font-semibold text-2xl text-cream tracking-tight">
            Approval Inbox
          </h1>
        </div>

        <span className="font-mono text-xs text-cream bg-carbon border border-steel px-3 py-1.5 rounded-[2px]">
          {pending.length} actions awaiting review
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Actions Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-syne font-semibold text-base text-cream">Pending Approvals Queue</h2>

          {pending.length === 0 ? (
            <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-10 text-center space-y-2 card-hover">
              <ShieldCheck size={32} className="mx-auto text-emerald-400" />
              <p className="font-syne font-semibold text-base text-cream">Approval queue is empty</p>
              <p className="font-inter text-xs text-pewter">
                All proposed AI actions have been resolved. No operational blockers pending.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((action) => (
                <div key={action.id} className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] uppercase font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-[2px]">
                          {action.action_type}
                        </span>
                        {action.action_type === 'vehicle.price_change' && (
                          <span className="font-mono text-[10px] uppercase font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-[2px]">
                            High Commercial Risk
                          </span>
                        )}
                      </div>
                      <h3 className="font-syne font-semibold text-sm text-cream">
                        {action.action_type === 'vehicle.price_change'
                          ? `Reduce asking price to £${action.input_payload?.new_price?.toLocaleString()}`
                          : action.input_payload?.title || 'Proposed Operation'}
                      </h3>
                    </div>

                    <span className="font-mono text-[11px] text-pewter">
                      {new Date(action.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Diff / Parameter Preview */}
                  <div className="p-3 bg-asphalt/60 rounded-[2px] border border-steel/40 font-inter text-xs space-y-1">
                    <p className="text-pewter font-mono text-[10px] uppercase tracking-wider">Payload Parameters:</p>
                    <pre className="text-silver font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(action.input_payload, null, 2)}
                    </pre>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-steel/40">
                    <button
                      onClick={() => handleReject(action.id)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-asphalt border border-steel text-pewter hover:text-cream text-xs font-inter rounded-[2px] transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(action.id)}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-blue text-void hover:bg-blue-dim text-xs font-inter font-semibold rounded-[2px] transition-colors cursor-pointer"
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
        <div className="lg:col-span-4 bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover font-inter text-[13px]">
          <div className="flex items-center justify-between border-b border-steel/60 pb-2">
            <h2 className="font-syne font-semibold text-base text-cream">Recent Action History</h2>
            <span className="font-mono text-[10px] text-pewter">{completedActions.length} RECORDED</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {completedActions.map(action => (
              <div key={action.id} className="p-3 bg-asphalt/50 border border-steel/40 rounded-[2px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase font-semibold text-silver">
                    {action.action_type}
                  </span>
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-[2px] ${
                    action.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
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
