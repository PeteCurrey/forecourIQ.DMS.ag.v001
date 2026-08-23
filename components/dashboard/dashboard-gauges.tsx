'use client';

import { DashboardGauge } from '@/lib/services/dashboard/dashboard-service';
import { cn } from '@/lib/utils';

interface DashboardGaugesProps {
  gauges: DashboardGauge[];
}

export default function DashboardGauges({ gauges }: DashboardGaugesProps) {
  if (!gauges || gauges.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {gauges.map((gauge) => {
        const isGood = gauge.status === 'good';
        const isWarning = gauge.status === 'warning';

        // Circumference for a semi-circle/arc or circular gauge
        const strokeColor = isGood ? 'text-emerald-600' : isWarning ? 'text-amber-500' : 'text-red-500';
        const barColor = isGood ? 'bg-emerald-600' : isWarning ? 'bg-amber-500' : 'bg-red-500';

        return (
          <div
            key={gauge.id}
            className="bg-carbon border border-steel rounded-lg p-4 flex flex-col justify-between"
            aria-label={`${gauge.label}: ${gauge.percentage}%. ${gauge.denominatorContext}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-pewter">
                {gauge.label}
              </span>
              <span className={cn('text-sm font-semibold tabular-nums', strokeColor)}>
                {gauge.percentage}%
              </span>
            </div>

            {/* Subtle linear gauge indicator */}
            <div className="w-full bg-asphalt rounded-full h-1.5 overflow-hidden my-1">
              <div
                className={cn('h-full rounded-full transition-all duration-700', barColor)}
                style={{ width: `${Math.min(100, Math.max(0, gauge.percentage))}%` }}
              />
            </div>

            <div className="text-[11px] text-pewter mt-1 truncate">
              {gauge.denominatorContext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
