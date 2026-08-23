'use client'

import { useState } from 'react'
import {
  MarketOverviewData,
  StockTurnMetric,
  DemandMetric,
} from '@/lib/types/intelligence'
import { formatCurrency } from '@/lib/format'
import { formatProvenanceBadge } from '@/lib/services/intelligence/provenance'
import {
  TrendingUp,
  Search,
  Eye,
  Users,
  Compass,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

export default function MarketClient({
  dealership,
  overview,
  stockTurns,
  websiteDemand,
}: {
  dealership: { name: string; city?: string; county?: string }
  overview: MarketOverviewData
  stockTurns: StockTurnMetric[]
  websiteDemand: DemandMetric
}) {
  const [selectedRadius, setSelectedRadius] = useState<string>('50')
  const badge = formatProvenanceBadge(overview.provenance.source_type)

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1600px] mx-auto w-full pb-20 space-y-6">
      {/* Header & Provenance */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-syne font-bold text-[28px] text-cream">Market Intelligence</h1>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-[2px]">
              {badge.label}
            </span>
          </div>
          <p className="font-inter text-[14px] text-pewter">
            First-party website demand velocity, stock turn statistics, and local market supply context for {dealership.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-carbon border border-steel rounded-[2px] p-1">
            {['25', '50', '100', 'uk'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRadius(r)}
                className={`px-3 py-1 text-[11px] font-mono uppercase transition-colors rounded-[2px] ${
                  selectedRadius === r
                    ? 'bg-blue text-white'
                    : 'text-pewter hover:text-cream'
                }`}
              >
                {r === 'uk' ? 'National' : `${r}m Radius`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Website Demand Index</span>
            <Search className="w-4 h-4 text-blue" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-syne font-bold text-[32px] text-cream leading-none">
              {websiteDemand.demand_index}
            </span>
            <span className="font-mono text-[11px] text-emerald-400">/ 100 Baseline</span>
          </div>
          <p className="font-inter text-[12px] text-pewter mt-3">
            {websiteDemand.searches_30d} searches · {websiteDemand.vehicle_views_30d} views (30d)
          </p>
        </div>

        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Median Days to Sale</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-syne font-bold text-[32px] text-cream leading-none">
              {overview.median_turn_days}
            </span>
            <span className="font-mono text-[11px] text-pewter">Days</span>
          </div>
          <p className="font-inter text-[12px] text-pewter mt-3">
            {overview.sales_velocity_30d} units sold in last 30 days
          </p>
        </div>

        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Active Inventory Value</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-[28px] text-cream leading-none">
              {formatCurrency(overview.internal_capital_invested)}
            </span>
          </div>
          <p className="font-inter text-[12px] text-pewter mt-3">
            {overview.internal_stock_count} units on forecourt
          </p>
        </div>

        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">External Market Feed</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono uppercase rounded-[2px]">
              <Info className="w-3.5 h-3.5" />
              Unconfigured
            </span>
          </div>
          <p className="font-inter text-[12px] text-pewter mt-3">
            AutoTrader / CAP HPI credentials required for live external supply.
          </p>
        </div>
      </div>

      {/* Website Demand Breakdown & Zero Result Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-carbon border border-steel rounded-[2px] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-steel pb-3">
            <h2 className="font-syne font-bold text-[16px] text-cream">First-Party Demand Funnel</h2>
            <span className="font-mono text-[10px] text-pewter">LAST 30 DAYS</span>
          </div>

          <div className="space-y-3 font-inter text-[13px]">
            <div className="flex items-center justify-between p-2.5 bg-asphalt rounded-[2px] border border-steel/50">
              <span className="text-pewter flex items-center gap-2">
                <Search className="w-4 h-4 text-blue" /> Search Interactions
              </span>
              <span className="font-mono font-bold text-cream">{websiteDemand.searches_30d}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-asphalt rounded-[2px] border border-steel/50">
              <span className="text-pewter flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" /> Vehicle Detail Views
              </span>
              <span className="font-mono font-bold text-cream">{websiteDemand.vehicle_views_30d}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-asphalt rounded-[2px] border border-steel/50">
              <span className="text-pewter flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" /> Direct Web Enquiries
              </span>
              <span className="font-mono font-bold text-cream">{websiteDemand.enquiries_30d}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-asphalt rounded-[2px] border border-steel/50">
              <span className="text-pewter flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" /> Finance Applications
              </span>
              <span className="font-mono font-bold text-cream">{websiteDemand.finance_starts_30d}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-asphalt rounded-[2px] border border-steel/50">
              <span className="text-pewter flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Online Reservations
              </span>
              <span className="font-mono font-bold text-cream">{websiteDemand.reservations_30d}</span>
            </div>
          </div>
        </div>

        {/* Stock Turn Performance Table */}
        <div className="lg:col-span-2 bg-carbon border border-steel rounded-[2px] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-steel pb-3">
            <div>
              <h2 className="font-syne font-bold text-[16px] text-cream">Historical Turn & Gross by Make</h2>
              <p className="font-inter text-[12px] text-pewter">
                Performance derived from confirmed sold vehicles in your stockbook.
              </p>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-[2px]">
              VERIFIED SALES
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-inter text-[13px]">
              <thead>
                <tr className="border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                  <th className="py-2.5">Make / Segment</th>
                  <th className="py-2.5 text-right">Units Sold</th>
                  <th className="py-2.5 text-right">Median Turn</th>
                  <th className="py-2.5 text-right">Median Gross</th>
                  <th className="py-2.5 text-right">Sample Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel/40">
                {stockTurns.map((st) => (
                  <tr key={st.segment} className="hover:bg-asphalt/50">
                    <td className="py-3 font-semibold text-cream">{st.segment}</td>
                    <td className="py-3 text-right font-mono text-pewter">{st.sample_size}</td>
                    <td className="py-3 text-right font-mono text-emerald-400">{st.median_days_to_sale} days</td>
                    <td className="py-3 text-right font-mono text-cream">{formatCurrency(st.median_actual_gross)}</td>
                    <td className="py-3 text-right">
                      {st.is_low_sample ? (
                        <span className="text-[10px] font-mono text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-[2px]">
                          Low Sample ({st.sample_size})
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-[2px]">
                          High Confidence
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Truthful External Market Advisory Note */}
      <div className="bg-asphalt border border-steel rounded-[2px] p-5 flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-blue shrink-0 mt-0.5" />
        <div className="space-y-1 font-inter text-[13px]">
          <p className="font-semibold text-cream">First-Party Intelligence Active</p>
          <p className="text-pewter">
            ForecourIQ is computing market velocity directly from your dealership stockbook and visitor telemetry. No speculative or scraped competitor figures are presented. Configure AutoTrader or CAP HPI credentials in Integrations to unlock licensed regional supply feeds.
          </p>
        </div>
      </div>
    </div>
  )
}
