'use client'

import { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  RefreshCw, 
  ArrowLeft, 
  Clock, 
  ShoppingBag, 
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
        toast.success(`${activeType === 'daily' ? 'Morning' : 'Weekly'} briefing regenerated`);
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
    <div className="max-w-[1480px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel/60 pb-4">
        <div>
          <Link href="/command-centre" className="inline-flex items-center gap-1 font-inter text-xs text-blue hover:underline mb-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <h1 className="font-syne-title text-2xl text-cream tracking-tight">
            {isDaily ? 'Daily Morning Briefing' : 'Weekly Management Review'}
          </h1>
          <p className="font-inter text-xs text-silver mt-0.5">
            {dealershipName} · {format(new Date(activeBrief.briefing_date), 'EEEE d MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily vs Weekly Toggle */}
          <div className="flex bg-asphalt p-0.5 rounded-[2px] border border-steel">
            <button
              onClick={() => handleTypeChange('daily')}
              className={`px-2.5 py-1 font-inter text-xs rounded-[2px] transition-colors cursor-pointer ${
                activeType === 'daily' ? 'bg-blue text-white font-medium' : 'text-silver hover:text-cream'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => handleTypeChange('weekly')}
              className={`px-2.5 py-1 font-inter text-xs rounded-[2px] transition-colors cursor-pointer ${
                activeType === 'weekly' ? 'bg-blue text-white font-medium' : 'text-silver hover:text-cream'
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Regenerate with Live Data Button */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1 px-3 py-1 bg-carbon border border-steel hover:border-slate text-cream font-inter text-xs rounded-[2px] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
            {isRegenerating ? 'Updating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Briefing Document (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Executive Synthesis */}
          <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-steel pb-2.5">
              <span className="font-mono text-[9px] text-blue uppercase tracking-wider font-semibold">
                Executive Synthesis · {activeBrief.model_name}
              </span>
              <span className="font-mono text-[10px] text-pewter">
                Generated {new Date(activeBrief.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="font-inter text-xs text-cream leading-relaxed whitespace-pre-wrap">
              {activeBrief.summary}
            </p>
          </div>

          {/* Structured Operational Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-inter text-xs">
            
            {/* Box 1: Yesterday's Performance */}
            <div className="bg-carbon border border-steel rounded-[2px] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-steel pb-2">
                <span className="font-inter font-semibold text-xs text-cream">Prior Period Performance</span>
                <Clock size={13} className="text-pewter" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-silver">Vehicles Delivered / Sold</span>
                  <span className="font-mono font-semibold text-cream">{payload?.yesterday?.units_sold || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">Actual Gross Profit</span>
                  <span className="font-mono font-semibold text-positive">{formatCurrency(payload?.yesterday?.gross_profit || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">New Leads Received</span>
                  <span className="font-mono font-semibold text-cream">{payload?.yesterday?.new_leads || 0}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Today's Operational Agenda */}
            <div className="bg-carbon border border-steel rounded-[2px] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-steel pb-2">
                <span className="font-inter font-semibold text-xs text-cream">Today's Operating Agenda</span>
                <Calendar size={13} className="text-blue" />
              </div>
              <div className="space-y-1.5">
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
                  <span className="font-mono font-semibold text-warning">{payload?.today?.prep_due || 0}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Priority Attention & Blockers */}
            <div className="bg-carbon border border-steel rounded-[2px] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-steel pb-2">
                <span className="font-inter font-semibold text-xs text-cream">Needs Attention</span>
                <ShieldAlert size={13} className="text-negative" />
              </div>
              {payload?.needs_attention?.items?.length ? (
                <ul className="space-y-1 text-[11px] text-silver">
                  {payload.needs_attention.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-negative font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-pewter text-xs">No critical blockers flagged.</p>
              )}
            </div>

            {/* Box 4: Commercial Intelligence Opportunities */}
            <div className="bg-carbon border border-steel rounded-[2px] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-steel pb-2">
                <span className="font-inter font-semibold text-xs text-cream">Market Opportunities</span>
                <ShoppingBag size={13} className="text-positive" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-silver">Acquisition Opportunities</span>
                  <span className="font-mono font-semibold text-positive">{payload?.intelligence?.buying_opportunities || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver">Pricing Attention Items</span>
                  <span className="font-mono font-semibold text-blue">{payload?.intelligence?.pricing_reviews || 0}</span>
                </div>
                <p className="text-[11px] text-pewter pt-0.5">
                  {payload?.intelligence?.summary}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Historical Briefings Browser (Right 4 cols) */}
        <div className="lg:col-span-4 bg-carbon border border-steel rounded-[2px] p-4 space-y-3 font-inter text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-steel pb-2">
            <h2 className="font-inter font-semibold text-sm text-cream">Previous Briefings</h2>
            <span className="font-mono text-[9px] text-pewter">{history.length} SAVED</span>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {history.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrief(b)}
                className={`w-full text-left p-2.5 rounded-[2px] border transition-colors cursor-pointer ${
                  activeBrief.id === b.id 
                    ? 'bg-asphalt border-blue text-cream font-medium' 
                    : 'bg-asphalt/40 border-steel/50 hover:border-steel text-silver'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-cream">
                    {format(new Date(b.briefing_date), 'dd MMM yyyy')}
                  </span>
                  <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded-[2px] bg-carbon border border-steel/60 text-pewter">
                    {b.briefing_type}
                  </span>
                </div>
                <p className="text-[11px] text-pewter truncate mt-0.5">
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
