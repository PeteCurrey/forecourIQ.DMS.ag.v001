'use client';

import { SalesPipelineSummary } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { Handshake, ArrowRight, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';

interface SalesPipelineStripProps {
  pipeline: SalesPipelineSummary;
  canViewMargin: boolean;
}

export default function SalesPipelineStrip({ pipeline, canViewMargin }: SalesPipelineStripProps) {
  const stages = [
    { label: 'Leads', count: pipeline.leadsCount, href: '/leads' },
    { label: 'Proposals', count: pipeline.proposalsCount, href: '/deals' },
    { label: 'Agreed', count: pipeline.agreedCount, href: '/deals' },
    { label: 'Handover', count: pipeline.handoverCount, href: '/deals' },
  ];

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      {/* Header with Pipeline Totals */}
      <div className="flex items-center justify-between border-b border-steel pb-3">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-pewter" />
          <h2 className="text-sm font-semibold text-cream">Sales & Deal Desk</h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {pipeline.totalPipelineValue > 0 && (
            <span className="text-pewter font-medium">
              Pipeline: <strong className="text-cream tabular-nums">{formatCurrency(pipeline.totalPipelineValue)}</strong>
            </span>
          )}
          {canViewMargin && pipeline.totalProjectedGross !== undefined && pipeline.totalProjectedGross > 0 && (
            <span className="text-emerald-600 font-medium">
              Proj. Gross: <strong className="tabular-nums">{formatCurrency(pipeline.totalProjectedGross)}</strong>
            </span>
          )}
          <Link href="/deals" className="text-pewter hover:text-cream underline">
            Deal Desk →
          </Link>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage, idx) => (
          <Link
            key={stage.label}
            href={stage.href}
            className="p-3 rounded bg-asphalt/40 border border-steel/60 hover:border-cream/30 transition-colors text-center block relative group"
          >
            <div className="text-[10px] font-sans uppercase font-semibold text-pewter tracking-wider mb-1">
              {stage.label}
            </div>
            <div className="text-xl font-bold text-cream font-sans tabular-nums group-hover:text-blue transition-colors">
              {stage.count}
            </div>
            {idx < stages.length - 1 && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:block text-pewter/40">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Active Deals List */}
      {pipeline.activeDeals.length > 0 && (
        <div className="pt-2 space-y-2">
          <div className="text-[11px] font-semibold text-pewter uppercase tracking-wider">
            Priority Active Deals
          </div>
          <div className="space-y-1.5">
            {pipeline.activeDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="flex items-center justify-between p-2.5 rounded bg-asphalt/30 border border-steel hover:bg-asphalt/60 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-asphalt border border-steel flex items-center justify-center text-pewter shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-cream truncate">{deal.vehicleName}</div>
                    <div className="text-[11px] text-pewter truncate">{deal.customerName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono uppercase bg-asphalt px-1.5 py-0.5 rounded text-pewter border border-steel">
                    {deal.stageLabel}
                  </span>
                  {deal.agreedPrice && (
                    <span className="font-semibold text-cream tabular-nums">
                      {formatCurrency(deal.agreedPrice)}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-pewter" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
