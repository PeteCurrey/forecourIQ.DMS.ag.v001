'use client';

import { useState } from 'react';
import { StockAgeBracket } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, ArrowRight, ShieldAlert, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface StockAgeingDistributionProps {
  brackets: StockAgeBracket[];
  ageingCapitalExposed: number;
  canViewMargin: boolean;
}

export default function StockAgeingDistribution({
  brackets,
  ageingCapitalExposed,
  canViewMargin,
}: StockAgeingDistributionProps) {
  const [hoveredBracket, setHoveredBracket] = useState<StockAgeBracket | null>(null);

  if (!brackets || brackets.length === 0) return null;

  const totalUnits = brackets.reduce((sum, b) => sum + b.count, 0);

  const getSegmentTheme = (range: string) => {
    switch (range) {
      case '0-30':
        return {
          bar: 'bg-emerald-500 hover:bg-emerald-400',
          badge: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        };
      case '31-45':
        return {
          bar: 'bg-emerald-600 hover:bg-emerald-500',
          badge: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/30',
        };
      case '46-60':
        return {
          bar: 'bg-amber-500 hover:bg-amber-400',
          badge: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        };
      case '61-90':
        return {
          bar: 'bg-orange-500 hover:bg-orange-400',
          badge: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
        };
      case '90+':
        return {
          bar: 'bg-rose-500 hover:bg-rose-400',
          badge: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
        };
      default:
        return { bar: 'bg-steel', badge: 'text-pewter bg-asphalt border-steel' };
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel pb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue" />
          <div>
            <h2 className="text-sm font-bold text-cream tracking-tight">Stock Ageing & Working Capital Distribution</h2>
            <p className="text-xs text-pewter">Interactive turnover analysis across holding periods</p>
          </div>
        </div>
        
        {canViewMargin && ageingCapitalExposed > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formatCurrency(ageingCapitalExposed)} Capital Exposed (&gt;45d)</span>
          </div>
        )}
      </div>

      {/* High-Resolution Segmented Distribution Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-asphalt rounded-xl h-5 flex overflow-hidden p-1 gap-1 border border-steel shadow-inner">
          {brackets.map((b) => {
            const widthPct = totalUnits > 0 ? (b.count / totalUnits) * 100 : 20;
            if (b.count === 0) return null;
            const theme = getSegmentTheme(b.range);

            return (
              <div
                key={b.range}
                onMouseEnter={() => setHoveredBracket(b)}
                onMouseLeave={() => setHoveredBracket(null)}
                style={{ width: `${Math.max(6, widthPct)}%` }}
                className={cn(
                  'h-full rounded-lg transition-all duration-300 cursor-pointer shadow-sm relative group',
                  theme.bar
                )}
                title={`${b.label}: ${b.count} units (${b.percentage}%)`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-pewter px-1">
          <span>0 Days (Fresh Arrival)</span>
          <span>45 Days (Benchmark)</span>
          <span>90+ Days (Liquidation Risk)</span>
        </div>
      </div>

      {/* 5 Interactive Cohort Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
        {brackets.map((b) => {
          const theme = getSegmentTheme(b.range);
          const isSelected = hoveredBracket?.range === b.range;

          return (
            <Link
              key={b.range}
              href="/stock"
              onMouseEnter={() => setHoveredBracket(b)}
              onMouseLeave={() => setHoveredBracket(null)}
              className={cn(
                'p-3.5 rounded-xl border transition-all duration-200 block space-y-1.5 relative',
                isSelected
                  ? 'bg-asphalt border-cream/50 shadow-md scale-102'
                  : 'bg-asphalt/40 border-steel/60 hover:border-cream/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cream">{b.label}</span>
                <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border', theme.badge)}>
                  {b.percentage}%
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-sans text-xl font-bold text-cream tabular-nums">{b.count}</span>
                <span className="text-[11px] text-pewter font-medium">vehicles</span>
              </div>
              {canViewMargin && (
                <div className="text-[11px] text-pewter tabular-nums font-semibold truncate pt-1 border-t border-steel/40">
                  {b.totalInvested > 0 ? formatCurrency(b.totalInvested) : '£0'}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Active Bracket Details Banner */}
      {hoveredBracket && (
        <div className="p-4 rounded-xl bg-asphalt border border-steel text-xs text-cream flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', getSegmentTheme(hoveredBracket.range).bar)} />
            <div>
              <span className="font-bold text-sm text-cream">{hoveredBracket.label} Cohort</span>
              <span className="text-pewter ml-2">
                — {hoveredBracket.count} units ({hoveredBracket.percentage}% of stockbook)
              </span>
              {canViewMargin && (
                <span className="text-cream font-semibold ml-2">
                  · Total Invested: {formatCurrency(hoveredBracket.totalInvested)}
                </span>
              )}
            </div>
          </div>
          <Link href="/stock" className="text-xs text-blue hover:underline flex items-center gap-1 font-bold">
            <span>Filter Forecourt Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
