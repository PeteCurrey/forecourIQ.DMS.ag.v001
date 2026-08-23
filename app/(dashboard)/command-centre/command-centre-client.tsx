'use client'

import { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Send, 
  X, 
  ArrowRight, 
  Calendar, 
  FileText,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyBriefing, AIRecommendation, AIAction } from '@/lib/types/iq';
import { BuyingSignal, PricingSignal } from '@/lib/types/intelligence';

interface CommandCentreClientProps {
  dealershipName: string;
  userName: string;
  userRole: string;
  todayBrief: DailyBriefing;
  recommendations: AIRecommendation[];
  pendingActions: AIAction[];
  buyingSignals: BuyingSignal[];
  pricingSignals: PricingSignal[];
}

export default function CommandCentreClient({
  dealershipName,
  userName,
  userRole,
  todayBrief: initialBrief,
  recommendations: initialRecs,
  pendingActions: initialActions,
  buyingSignals,
  pricingSignals,
}: CommandCentreClientProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    evidence?: Array<{ label: string; value: string | number }>;
  }>>([
    {
      role: 'assistant',
      content: `Good morning, ${userName.split(' ')[0]}. I'm ready to answer any operational questions regarding stockbook, leads, deal desk, compliance, or market intelligence for ${dealershipName}.`,
    }
  ]);

  const [recommendations, setRecommendations] = useState(initialRecs);
  const [pendingActions, setPendingActions] = useState(initialActions);

  const suggestedQueries = [
    "What needs my attention today?",
    "Which stock should I review pricing on?",
    "Which leads have had no follow-up?",
    "What buying opportunities are strongest?",
  ];

  const handleAsk = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg = text.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/iq/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg }),
      });
      const data = await res.json();

      if (data.data) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data.answer,
          evidence: data.data.evidence,
        }]);
      } else {
        toast.error(data.error || 'Failed to process inquiry');
      }
    } catch {
      toast.error('Network error contacting IQ service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      const res = await fetch(`/api/iq/actions/${actionId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.data?.success) {
        toast.success('Action approved and executed successfully');
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
      } else {
        toast.error(data.error || 'Failed to approve action');
      }
    } catch {
      toast.error('Network error approving action');
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      const res = await fetch(`/api/iq/actions/${actionId}/reject`, { method: 'POST' });
      if (res.ok) {
        toast.success('Action rejected');
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
      }
    } catch {
      toast.error('Network error rejecting action');
    }
  };

  const handleDismissRec = async (recId: string) => {
    try {
      const res = await fetch(`/api/iq/recommendations/${recId}/dismiss`, { method: 'POST' });
      if (res.ok) {
        toast.success('Recommendation dismissed');
        setRecommendations(prev => prev.filter(r => r.id !== recId));
      }
    } catch {
      toast.error('Error dismissing recommendation');
    }
  };

  const briefPayload = initialBrief.structured_payload;

  return (
    <div className="max-w-[1480px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel/60 pb-4">
        <div>
          <h1 className="font-syne-title text-2xl text-cream tracking-tight">
            Command Centre
          </h1>
          <p className="font-inter text-xs text-silver mt-0.5">
            Real-time grounded operational intelligence for {dealershipName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/command-centre/brief"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-carbon border border-steel text-cream text-xs font-inter font-medium rounded-[2px] hover:bg-asphalt hover:border-slate transition-colors"
          >
            <FileText size={13} className="text-blue" />
            Daily Briefing
          </Link>
          <Link
            href="/settings/iq"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-carbon border border-steel text-cream text-xs font-inter font-medium rounded-[2px] hover:bg-asphalt hover:border-slate transition-colors"
          >
            <Shield size={13} className="text-pewter" />
            IQ Policy
          </Link>
        </div>
      </div>

      {/* 2. Morning Briefing Summary Strip */}
      <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel pb-2.5">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue" />
            <h2 className="font-inter font-semibold text-sm text-cream">Today's Executive Briefing</h2>
          </div>
          <Link href="/command-centre/brief" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
            Full brief <ArrowRight size={11} />
          </Link>
        </div>

        <p className="font-inter text-xs text-silver leading-relaxed">
          {initialBrief.summary}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-inter text-xs">
          <div className="p-2.5 bg-asphalt/60 border border-steel/60 rounded-[2px]">
            <span className="text-[10px] text-pewter font-medium block uppercase tracking-wider">Test Drives & Viewings</span>
            <span className="font-mono font-bold text-lg text-cream mt-0.5">{briefPayload?.today?.test_drives || 0}</span>
          </div>

          <div className="p-2.5 bg-asphalt/60 border border-steel/60 rounded-[2px]">
            <span className="text-[10px] text-pewter font-medium block uppercase tracking-wider">Follow-ups Due</span>
            <span className="font-mono font-bold text-lg text-warning mt-0.5">{briefPayload?.today?.followups_due || 0}</span>
          </div>

          <div className="p-2.5 bg-asphalt/60 border border-steel/60 rounded-[2px]">
            <span className="text-[10px] text-pewter font-medium block uppercase tracking-wider">Buying Opportunities</span>
            <span className="font-mono font-bold text-lg text-positive mt-0.5">{briefPayload?.intelligence?.buying_opportunities || 0}</span>
          </div>

          <div className="p-2.5 bg-asphalt/60 border border-steel/60 rounded-[2px]">
            <span className="text-[10px] text-pewter font-medium block uppercase tracking-wider">Pricing Reviews</span>
            <span className="font-mono font-bold text-lg text-blue mt-0.5">{briefPayload?.intelligence?.pricing_reviews || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Split: Ask IQ (Left 7 cols) & Priority Actions / Approvals (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Ask IQ Conversational Console (7 cols) */}
        <div className="lg:col-span-7 bg-carbon border border-steel rounded-[2px] p-5 flex flex-col justify-between space-y-4 min-h-[520px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-steel pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-blue" />
                <h2 className="font-inter font-semibold text-sm text-cream">Ask IQ Console</h2>
              </div>
              <span className="font-mono text-[9px] text-pewter uppercase">
                Grounded Facts · {initialBrief.model_name}
              </span>
            </div>

            {/* Suggested Operational Queries */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {suggestedQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(q)}
                  className="px-2.5 py-1 bg-asphalt border border-steel hover:border-blue text-silver hover:text-cream text-[11px] font-inter rounded-[2px] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Conversation Transcript */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-[2px] text-xs font-inter leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-blue/10 border border-blue/20 text-cream ml-6' 
                      : 'bg-asphalt/60 border border-steel/60 text-silver mr-3'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[9px] uppercase font-semibold text-pewter">
                      {m.role === 'user' ? userName.split(' ')[0] : 'ForecourIQ IQ'}
                    </span>
                  </div>
                  <p className="text-cream whitespace-pre-wrap">{m.content}</p>

                  {/* Evidence Citations */}
                  {m.evidence && m.evidence.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-steel/40 grid grid-cols-2 gap-1.5 text-[11px]">
                      {m.evidence.map((ev, eIdx) => (
                        <div key={eIdx} className="bg-carbon p-1.5 rounded-[2px] border border-steel/50">
                          <span className="text-pewter block text-[10px]">{ev.label}</span>
                          <span className="font-mono font-semibold text-cream">{ev.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="p-2.5 bg-asphalt/60 border border-steel/50 text-pewter text-xs font-inter animate-pulse rounded-[2px]">
                  IQ is reviewing live dealership data...
                </div>
              )}
            </div>
          </div>

          {/* Prompt Input Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAsk(query); }} 
            className="flex items-center gap-2 pt-3 border-t border-steel"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about stock, leads, deals or today's priorities..."
              className="flex-1 bg-carbon border border-steel h-9 px-3 rounded-[2px] font-inter text-xs text-cream placeholder:text-pewter focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="h-9 px-3.5 bg-blue hover:bg-blue-dim text-white rounded-[2px] font-inter font-medium text-xs flex items-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send size={12} />
              Ask
            </button>
          </form>
        </div>

        {/* Priority Actions & Pending Approvals (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Pending Human Approvals Queue */}
          <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-3 font-inter text-xs">
            <div className="flex items-center justify-between border-b border-steel pb-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-warning" />
                <h2 className="font-inter font-semibold text-sm text-cream">Pending Approvals</h2>
              </div>
              <span className="font-mono text-[9px] text-warning bg-warning/10 px-2 py-0.5 rounded-[2px] font-semibold">
                {pendingActions.length} PENDING
              </span>
            </div>

            {pendingActions.length === 0 ? (
              <p className="font-inter text-xs text-pewter py-3 text-center">
                No proposed AI actions awaiting human review.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingActions.map(action => (
                  <div key={action.id} className="p-3 bg-asphalt/60 border border-steel/60 rounded-[2px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-warning uppercase font-semibold">
                        {action.action_type}
                      </span>
                      <span className="text-[10px] text-pewter font-mono">
                        {new Date(action.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="font-medium text-cream text-xs">
                      {action.action_type === 'vehicle.price_change' 
                        ? `Change Asking Price to £${action.input_payload?.new_price}`
                        : action.input_payload?.title || 'Proposed Operation'}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleRejectAction(action.id)}
                        className="px-2 py-1 bg-carbon border border-steel text-pewter hover:text-cream text-[11px] font-inter rounded-[2px] transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveAction(action.id)}
                        className="px-2.5 py-1 bg-blue text-white hover:bg-blue-dim text-[11px] font-inter font-medium rounded-[2px] transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proactive Recommendations Queue */}
          <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-3 font-inter text-xs">
            <div className="flex items-center justify-between border-b border-steel pb-2">
              <h2 className="font-inter font-semibold text-sm text-cream">Recommendations</h2>
              <span className="font-mono text-[9px] text-pewter">
                {recommendations.length} ACTIVE
              </span>
            </div>

            {recommendations.length === 0 ? (
              <p className="font-inter text-xs text-pewter py-3 text-center">
                All dealership operations within optimal thresholds.
              </p>
            ) : (
              <div className="space-y-2">
                {recommendations.slice(0, 3).map(rec => (
                  <div key={rec.id} className="p-3 bg-asphalt/60 border border-steel/60 rounded-[2px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-blue uppercase font-semibold">
                        {rec.category}
                      </span>
                      <button
                        onClick={() => handleDismissRec(rec.id)}
                        className="text-pewter hover:text-silver text-[11px] p-0.5 cursor-pointer"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="font-semibold text-cream text-xs">{rec.title}</p>
                    <p className="text-[11px] text-silver">{rec.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
