'use client';

import { useState } from 'react';
import { DashboardGauge } from '@/lib/services/dashboard/dashboard-service';
import { cn } from '@/lib/utils';
import { Activity, ShieldCheck, Zap, Info, ArrowUpRight } from 'lucide-react';

interface DashboardGaugesProps {
  gauges: DashboardGauge[];
}

export default function DashboardGauges({ gauges }: DashboardGaugesProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (!gauges || gauges.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {gauges.map((gauge) => {
        const isGood = gauge.status === 'good';
        const isWarning = gauge.status === 'warning';

        const strokeColor = isGood ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444';
        const glowColor = isGood ? 'rgba(16, 185, 129, 0.25)' : isWarning ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)';
        const textColor = isGood ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-rose-500';
        const badgeBg = isGood ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : isWarning ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600';

        // Semi-circle radial arc geometry (180 deg)
        const radius = 42;
        const circumference = Math.PI * radius;
        const clampedPct = Math.min(100, Math.max(0, gauge.percentage));
        const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

        return (
          <div
            key={gauge.id}
            onMouseEnter={() => setActiveTooltip(gauge.id)}
            onMouseLeave={() => setActiveTooltip(null)}
            className="bg-carbon border border-steel rounded-xl p-5 relative flex flex-col justify-between group transition-all duration-300 hover:border-cream/40 hover:shadow-lg hover:shadow-black/5"
            aria-label={`${gauge.label}: ${gauge.percentage}%. ${gauge.denominatorContext}`}
          >
            {/* Header: Label & Status Pill */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full animate-pulse', isGood ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500')} />
                <span className="text-[12px] font-sans font-semibold uppercase tracking-wider text-pewter">
                  {gauge.label}
                </span>
              </div>
              <span className={cn('text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border', badgeBg)}>
                {isGood ? 'OPTIMAL' : isWarning ? 'ATTENTION' : 'CRITICAL'}
              </span>
            </div>

            {/* Automotive Instrument Cluster Dial */}
            <div className="flex items-center justify-center my-3 relative">
              <svg viewBox="0 0 110 68" className="w-40 h-24 overflow-visible">
                <defs>
                  <linearGradient id={`grad-${gauge.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isGood ? '#059669' : isWarning ? '#D97706' : '#DC2626'} />
                    <stop offset="100%" stopColor={strokeColor} />
                  </linearGradient>
                  <filter id={`glow-${gauge.id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Subtle outer tick ring */}
                <path
                  d="M 8 58 A 47 47 0 0 1 102 58"
                  fill="none"
                  stroke="var(--color-steel)"
                  strokeWidth="1"
                  strokeDasharray="1.5 5.5"
                  className="opacity-60"
                />

                {/* Background track (semi-circle) */}
                <path
                  d="M 13 58 A 42 42 0 0 1 97 58"
                  fill="none"
                  stroke="var(--color-asphalt)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />

                {/* Active value arc with glow filter */}
                <path
                  d="M 13 58 A 42 42 0 0 1 97 58"
                  fill="none"
                  stroke={`url(#grad-${gauge.id})`}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  filter={`url(#glow-${gauge.id})`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Centered Instrument Readout */}
              <div className="absolute top-8 flex flex-col items-center justify-center text-center">
                <div className="flex items-baseline">
                  <span className={cn('text-3xl font-bold font-sans tracking-tight tabular-nums', textColor)}>
                    {gauge.percentage}
                  </span>
                  <span className="text-sm font-semibold text-pewter ml-0.5">%</span>
                </div>
                <span className="text-[10px] uppercase font-mono font-medium text-pewter tracking-wider">
                  Target &gt; {isGood ? '80%' : '85%'}
                </span>
              </div>
            </div>

            {/* Verified Denominator Context */}
            <div className="pt-2 border-t border-steel/60 flex items-center justify-between text-xs">
              <span className="text-[11px] text-pewter font-medium truncate">
                {gauge.denominatorContext}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-pewter/60 group-hover:text-cream transition-colors shrink-0 ml-1" />
            </div>

            {/* Supporting Detail Hover Reveal (Rich Automotive Card Overlay) */}
            {activeTooltip === gauge.id && (
              <div className="absolute inset-0 bg-carbon/98 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between text-xs text-cream z-20 animate-fade-in border border-steel shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-steel">
                    <span className="font-semibold text-xs text-cream uppercase tracking-wide">{gauge.label} Analytics</span>
                    <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded', badgeBg)}>{gauge.percentage}% Rate</span>
                  </div>
                  <p className="text-pewter text-xs leading-relaxed mb-3">
                    {gauge.denominatorContext}. Calculated deterministically against real active dealership inventory.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-steel/60 text-[11px] font-mono">
                  <div className="bg-asphalt p-2 rounded">
                    <span className="text-pewter text-[9px] block">QUALIFYING</span>
                    <span className="font-bold text-cream tabular-nums">{gauge.numerator} units</span>
                  </div>
                  <div className="bg-asphalt p-2 rounded">
                    <span className="text-pewter text-[9px] block">TOTAL COHORT</span>
                    <span className="font-bold text-cream tabular-nums">{gauge.denominator} units</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
