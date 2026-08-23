'use client';

import { useState } from 'react';
import { DashboardGauge } from '@/lib/services/dashboard/dashboard-service';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface DashboardGaugesProps {
  gauges: DashboardGauge[];
}

export default function DashboardGauges({ gauges }: DashboardGaugesProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (!gauges || gauges.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {gauges.map((gauge) => {
        const isGood = gauge.status === 'good';
        const isWarning = gauge.status === 'warning';

        const strokeColor = isGood ? '#059669' : isWarning ? '#d97706' : '#dc2626';
        const textColor = isGood ? 'text-emerald-600' : isWarning ? 'text-amber-500' : 'text-red-500';

        // Semi-circle radial arc geometry (radius 42, center 50,50, arc length)
        const radius = 38;
        const circumference = Math.PI * radius; // 180 degree semi-circle
        const clampedPct = Math.min(100, Math.max(0, gauge.percentage));
        const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

        return (
          <div
            key={gauge.id}
            onMouseEnter={() => setActiveTooltip(gauge.id)}
            onMouseLeave={() => setActiveTooltip(null)}
            className="bg-carbon border border-steel rounded-lg p-4 relative flex flex-col justify-between group transition-colors hover:border-cream/30"
            aria-label={`${gauge.label}: ${gauge.percentage}%. ${gauge.denominatorContext}`}
          >
            {/* Top Label & Info Icon */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-pewter">
                {gauge.label}
              </span>
              <Info className="w-3.5 h-3.5 text-pewter/60 group-hover:text-pewter transition-colors cursor-pointer" />
            </div>

            {/* Radial Semi-Circle Instrument Dial */}
            <div className="flex items-center justify-center my-2 relative">
              <svg viewBox="0 0 100 60" className="w-32 h-20 overflow-visible">
                {/* Background track (semi-circle) */}
                <path
                  d="M 12 52 A 38 38 0 0 1 88 52"
                  fill="none"
                  stroke="var(--color-asphalt)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Active value arc */}
                <path
                  d="M 12 52 A 38 38 0 0 1 88 52"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Centered Value */}
              <div className="absolute top-6 flex flex-col items-center justify-center">
                <span className={cn('text-xl font-bold font-sans tracking-tight tabular-nums', textColor)}>
                  {gauge.percentage}%
                </span>
              </div>
            </div>

            {/* Explicit Denominator Context Caption */}
            <div className="text-[11px] text-pewter text-center font-medium mt-1 truncate">
              {gauge.denominatorContext}
            </div>

            {/* Supporting Detail Hover Reveal (Overlay without displacement) */}
            {activeTooltip === gauge.id && (
              <div className="absolute inset-0 bg-carbon/95 backdrop-blur-xs rounded-lg p-4 flex flex-col justify-center text-xs text-cream z-10 animate-fade-in border border-steel">
                <p className="font-semibold text-xs mb-1">{gauge.label} Detail</p>
                <p className="text-pewter text-[11px] leading-relaxed mb-2">{gauge.denominatorContext}</p>
                <div className="text-[10px] text-silver font-mono">
                  Numerator: {gauge.numerator} · Denominator: {gauge.denominator}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
