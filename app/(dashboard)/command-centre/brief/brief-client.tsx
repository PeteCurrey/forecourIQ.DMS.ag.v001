'use client'

import { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShoppingBag, 
  Tag, 
  Layers, 
  TrendingUp, 
  Car, 
  FileText,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { DailyBriefing, BriefingType } from '@/lib/types/iq';
import { format } from 'date-fns';

interface BriefClientProps {
  dealershipName: string;
  userName: string;
  dailyBrief: DailyBriefing;
  weeklyBrief: DailyBriefing;
  history: DailyBriefing[];
}

export default function BriefClient({
  dealershipName,
  userName,
  dailyBrief: initialDaily,
  weeklyBrief: initialWeekly,
  history,
}: BriefClientProps) {
  const [activeType, setActiveType] = useState<BriefingType>('daily');
  const [activeBrief, setActiveBrief] = useState<DailyBriefing>(initialDaily);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleTypeChange = (type: BriefingType) => {
    setActiveType(type);
    setActiveBrief(type === 'daily' ? initialDaily : initialWeekly);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/iq/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType }),
      });
      const data = await res.json();
      if (data.data) {
        setActiveBrief(data.data);
        toast.success(`${activeType === 'daily' ? 'Morning' : 'Weekly'} briefing regenerated with live data`);
      } else {
        toast.error(data.error || 'Failed to regenerate briefing');
      }
    } catch {
      toast.error('Network error regenerating briefing');
    } finally {
      setIsRegenerating(false);
    }
  };

  const payload = activeBrief.structured_payload;
  const isDaily = activeType === 'daily';

  return (
    <div className="max-w-[1520px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel/60 pb-5">
        <div>
          <Link href="/command-centre" className="inline-flex items-center gap-1.5 font-inter text-xs text-blue hover:underline mb-1.5">
            <ArrowLeft size={13} /> Return to Command Centre
          </Link>
          <h1 className="font-syne font-semibold text-2xl text-cream tracking-tight">
            {isDaily ? 'Daily Morning Briefing' : 'Weekly Management Review'}
          </h1>
          <p className="font-inter text-[13px] text-silver mt-0.5">
            {dealershipName} · {format(new Date(activeBrief.briefing_date), 'EEEE d MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Daily vs Weekly Toggle */}
          <div className="flex bg-asphalt p-0.5 rounded-[2px] border border-steel">
            <button
              onClick={() => handleTypeChange('daily')}
              className={`px-3 py-1.5 font-inter text-xs rounded-[2px] transition-colors ${
                activeType === 'daily' ? 'bg-blue text-void font-semibold' : 'text-silver hover:text-cream'
              }`}
            >
              Daily Brief
            </button>
            <button
              onClick={() => handleTypeChange('weekly')}
              className={`px-3 py-1.5 font-inter text-xs rounded-[2px] transition-colors ${
                activeType === 'weekly' ? 'bg-blue text-void font-semibold' : 'text-silver hover:text-cream'
              }`}
            >
              Weekly Review
            </button>
          </div>

          {/* Regenerate with Live Data Button */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-asphalt/80 border border-steel hover:border-slate text-cream font-inter text-xs rounded-[2px] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
            {isRegenerating ? 'Updating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Briefing Document (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Executive Synthesis */}
          <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-6 space-y-3 card-hover">
            <div className="flex items-center justify-between border-b border-steel/60 pb-3">
              <span className="font-mono text-[10px] text-blue uppercase tracking-widest font-semibold">
                Executive Synthesis · {activeBrief.model_name}
              </span>
              <span className="font-mono text-[11px] text-pewter">
                Generated {new Date(activeBrief.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="font-inter text-[14px] text-cream leading-relaxed whitespace-pre-wrap">
              {activeBrief.summary}
            </p>
          </div>

          {/* Structured Operational Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-inter text-[13px]">
            
            {/* Box 1: Yesterday's Performance */}
            <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
              <div className="flex items-center justify-between border-b border-steel/60 pb-2">
                <span className="font-syne font-semibold text-cream">Prior Period Performance</span>
                <Clock size={14} className="text-pewter" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-silver">Vehicles Delivered / Sold</span>
                  <span className="font-mono font-semibold text-cream">{payload?.yesterday?.units_sold || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">Actual Gross Profit</span>
                  <span className="font-mono font-semibold text-emerald-400">{formatCurrency(payload?.yesterday?.gross_profit || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">New Leads Received</span>
                  <span className="font-mono font-semibold text-cream">{payload?.yesterday?.new_leads || 0}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Today's Operational Agenda */}
            <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
              <div className="flex items-center justify-between border-b border-steel/60 pb-2">
                <span className="font-syne font-semibold text-cream">Today's Operating Agenda</span>
                <Calendar size={14} className="text-blue" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-silver">Test Drives & Viewings</span>
                  <span className="font-mono font-semibold text-cream">{payload?.today?.test_drives || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">Scheduled Handovers</span>
                  <span className="font-mono font-semibold text-blue">{payload?.today?.handovers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">Preparation Deadlines</span>
                  <span className="font-mono font-semibold text-amber-400">{payload?.today?.prep_due || 0}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Priority Attention & Blockers */}
            <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
              <div className="flex items-center justify-between border-b border-steel/60 pb-2">
                <span className="font-syne font-semibold text-cream">Needs Attention</span>
                <ShieldAlert size={14} className="text-rose-400" />
              </div>
              {payload?.needs_attention?.items?.length ? (
                <ul className="space-y-1.5 text-[12px] text-silver">
                  {payload.needs_attention.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-pewter text-xs">No critical blockers flagged.</p>
              )}
            </div>

            {/* Box 4: Commercial Intelligence Opportunities */}
            <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
              <div className="flex items-center justify-between border-b border-steel/60 pb-2">
                <span className="font-syne font-semibold text-cream">Market Opportunities</span>
                <ShoppingBag size={14} className="text-emerald-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-silver">Acquisition Opportunities</span>
                  <span className="font-mono font-semibold text-emerald-400">{payload?.intelligence?.buying_opportunities || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">Pricing Attention Items</span>
                  <span className="font-mono font-semibold text-blue">{payload?.intelligence?.pricing_reviews || 0}</span>
                </div>
                <p className="text-[11px] text-pewter pt-1">
                  {payload?.intelligence?.summary}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Historical Briefings Browser (Right 4 cols) */}
        <div className="lg:col-span-4 bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover font-inter text-[13px]">
          <div className="flex items-center justify-between border-b border-steel/60 pb-2">
            <h2 className="font-syne font-semibold text-base text-cream">Previous Briefings</h2>
            <span className="font-mono text-[10px] text-pewter">{history.length} SAVED</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {history.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrief(b)}
                className={`w-full text-left p-3 rounded-[2px] border transition-all cursor-pointer ${
                  activeBrief.id === b.id 
                    ? 'bg-asphalt border-blue text-cream' 
                    : 'bg-asphalt/50 border-steel/40 hover:border-steel text-silver'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-cream">
                    {format(new Date(b.briefing_date), 'dd MMM yyyy')}
                  </span>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[2px] bg-carbon border border-steel/60 text-pewter">
                    {b.briefing_type}
                  </span>
                </div>
                <p className="text-[11px] text-pewter truncate mt-1">
                  {b.summary.slice(0, 75)}...
                </p>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
