'use client';

import { DailyPerformancePoint } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Line, ComposedChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface PerformanceChart30dProps {
  points: DailyPerformancePoint[];
  totalSold: number;
  totalGross?: number;
  canViewMargin: boolean;
}

export default function PerformanceChart30d({
  points,
  totalSold,
  totalGross,
  canViewMargin,
}: PerformanceChart30dProps) {
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'var(--color-carbon)',
      border: '1px solid var(--color-steel)',
      borderRadius: '4px',
      fontSize: '11px',
      color: 'var(--color-cream)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
  };

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-steel pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-pewter" />
          <h2 className="text-sm font-semibold text-cream">30-Day Performance</h2>
        </div>
        <div className="text-xs text-pewter">
          <strong className="text-cream tabular-nums">{totalSold}</strong> sold
          {canViewMargin && totalGross !== undefined && (
            <>
              {' · '}
              <strong className="text-emerald-600 tabular-nums">{formatCurrency(totalGross)}</strong> gross
            </>
          )}
          {' · Last 30 days'}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'var(--color-pewter)' }}
              axisLine={{ stroke: 'var(--color-steel)' }}
              tickLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="units"
              tick={{ fontSize: 9, fill: 'var(--color-pewter)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            {canViewMargin && (
              <YAxis
                yAxisId="gross"
                orientation="right"
                hide={true}
              />
            )}
            <Tooltip
              {...tooltipStyle}
              formatter={(value: any, name: any) => {
                if (name === 'Units Sold') return [value, 'Units Sold'];
                if (name === 'Gross Margin') return [formatCurrency(Number(value)), 'Gross Profit'];
                return [value, name];
              }}
            />
            <Bar
              yAxisId="units"
              dataKey="unitsSold"
              name="Units Sold"
              fill="#0ea5e9"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
            />
            {canViewMargin && (
              <Line
                yAxisId="gross"
                type="monotone"
                dataKey="grossMargin"
                name="Gross Margin"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
