'use client';

import { useState } from 'react';
import { StockAgeBracket } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
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

  const getSegmentColor = (range: string) => {
    switch (range) {
      case '0-30': return 'bg-emerald-600';
      case '31-45': return 'bg-emerald-500';
      case '46-60': return 'bg-amber-500';
      case '61-90': return 'bg-orange-500';
      case '90+': return 'bg-red-500';
      default: return 'bg-steel';
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-pewter" />
          <h2 className="text-sm font-semibold text-cream">Stock Ageing Distribution</h2>
        </div>
        {canViewMargin && ageingCapitalExposed > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{formatCurrency(ageingCapitalExposed)} invested &gt; 45d</span>
          </div>
        )}
      </div>

      {/* Segmented Distribution Bar */}
      <div className="w-full bg-asphalt rounded-full h-3 flex overflow-hidden p-0.5 gap-0.5">
        {brackets.map((b) => {
          const widthPct = totalUnits > 0 ? (b.count / totalUnits) * 100 : 20;
          if (b.count === 0) return null;

          return (
            <div
              key={b.range}
              onMouseEnter={() => setHoveredBracket(b)}
              onMouseLeave={() => setHoveredBracket(null)}
              style={{ width: `${Math.max(5, widthPct)}%` }}
              className={cn(
                'h-full rounded-full transition-all duration-300 cursor-pointer hover:opacity-80',
                getSegmentColor(b.range)
              )}
              title={`${b.label}: ${b.count} units`}
            />
          );
        })}
      </div>

      {/* Brackets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {brackets.map((b) => (
          <Link
            key={b.range}
            href="/stock"
            onMouseEnter={() => setHoveredBracket(b)}
            onMouseLeave={() => setHoveredBracket(null)}
            className="p-2.5 rounded bg-asphalt/40 border border-steel/60 hover:border-cream/30 transition-colors text-xs space-y-1 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cream">{b.label}</span>
              <span className="font-mono text-xs font-bold text-cream tabular-nums">{b.count}</span>
            </div>
            {canViewMargin && (
              <div className="text-[10px] text-pewter truncate tabular-nums">
                {b.totalInvested > 0 ? formatCurrency(b.totalInvested) : '£0'}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Active Bracket Details Callout */}
      {hoveredBracket && (
        <div className="p-3 rounded bg-asphalt/60 border border-steel text-xs text-cream flex items-center justify-between animate-fade-in">
          <div>
            <span className="font-semibold">{hoveredBracket.label}</span>: {hoveredBracket.count} units ({hoveredBracket.percentage}% of stock).
            {canViewMargin && (
              <span className="text-pewter ml-2">Total Capital: {formatCurrency(hoveredBracket.totalInvested)}</span>
            )}
          </div>
          <Link href="/stock" className="text-xs text-cream hover:underline flex items-center gap-1 font-medium">
            <span>Filter Stockbook</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
