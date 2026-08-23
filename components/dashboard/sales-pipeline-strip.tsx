'use client';

import { SalesPipelineSummary } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { Handshake, ArrowRight, ChevronRight, User, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface SalesPipelineStripProps {
  pipeline: SalesPipelineSummary;
  canViewMargin: boolean;
}

export default function SalesPipelineStrip({ pipeline, canViewMargin }: SalesPipelineStripProps) {
  const stages = [
    { label: 'Qualified Leads', count: pipeline.leadsCount, href: '/leads', badge: 'bg-blue/10 text-blue border-blue/30' },
    { label: 'Proposals Sent', count: pipeline.proposalsCount, href: '/deals', badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
    { label: 'Agreed Deals', count: pipeline.agreedCount, href: '/deals', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
    { label: 'Handover Ready', count: pipeline.handoverCount, href: '/deals', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  ];

  return (
    <div className="bg-carbon border border-steel rounded-xl p-6 space-y-5 flex flex-col justify-between">
      {/* Header with Pipeline Totals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel pb-4">
        <div className="flex items-center gap-2.5">
          <Handshake className="w-4 h-4 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-cream tracking-tight">Deal Desk Pipeline</h2>
            <p className="text-xs text-pewter">Active deal progression from proposal to keys handover</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {pipeline.totalPipelineValue > 0 && (
            <span className="text-pewter font-medium bg-asphalt px-2.5 py-1 rounded-md border border-steel">
              Pipeline: <strong className="text-cream tabular-nums">{formatCurrency(pipeline.totalPipelineValue)}</strong>
            </span>
          )}
          {canViewMargin && pipeline.totalProjectedGross !== undefined && pipeline.totalProjectedGross > 0 && (
            <span className="text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
              Gross: <strong className="tabular-nums">{formatCurrency(pipeline.totalProjectedGross)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Visual Deal Flow Chevron Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {stages.map((stage, idx) => (
          <Link
            key={stage.label}
            href={stage.href}
            className="p-3.5 rounded-xl bg-asphalt/50 border border-steel/60 hover:border-cream/40 transition-all duration-200 text-center block relative group hover:shadow-md"
          >
            <div className="text-[10px] font-sans uppercase font-bold text-pewter tracking-wider mb-1 truncate">
              {stage.label}
            </div>
            <div className="text-2xl font-black text-cream font-sans tabular-nums group-hover:text-blue transition-colors">
              {stage.count}
            </div>
            {idx < stages.length - 1 && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:block text-pewter/40">
                <ChevronRight className="w-4 h-4" />
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Active High-Value Deals */}
      {pipeline.activeDeals.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-pewter uppercase tracking-wider">
            <span>Priority Active Deals</span>
            <Link href="/deals" className="text-[11px] text-blue hover:underline font-bold capitalize">
              View Deal Board →
            </Link>
          </div>

          <div className="space-y-2">
            {pipeline.activeDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-asphalt/40 border border-steel hover:border-cream/40 hover:bg-asphalt transition-all text-xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-cream text-void dark:bg-cream dark:text-void font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {deal.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-cream truncate group-hover:text-blue transition-colors">
                      {deal.vehicleName}
                    </div>
                    <div className="text-[11px] text-pewter truncate font-medium">{deal.customerName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono font-bold uppercase bg-carbon px-2 py-0.5 rounded-full text-cream border border-steel">
                    {deal.stageLabel}
                  </span>
                  {deal.agreedPrice && (
                    <span className="font-bold text-cream tabular-nums text-xs">
                      {formatCurrency(deal.agreedPrice)}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-pewter group-hover:text-cream transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
