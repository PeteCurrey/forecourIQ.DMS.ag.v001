'use client';

import { DailyPerformancePoint } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Line, ComposedChart, Area } from 'recharts';
import { TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';

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
      borderRadius: '8px',
      fontSize: '12px',
      color: 'var(--color-cream)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      padding: '8px 12px',
    },
  };

  return (
    <div className="bg-carbon border border-steel rounded-xl p-6 space-y-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel pb-4">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-cream tracking-tight">30-Day Sales & Profit Performance</h2>
            <p className="text-xs text-pewter">Volume delivery cadence and gross margin generation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-asphalt px-2.5 py-1 rounded-md border border-steel text-cream font-bold tabular-nums">
            {totalSold} units sold
          </div>
          {canViewMargin && totalGross !== undefined && (
            <div className="bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-600 font-bold tabular-nums">
              {formatCurrency(totalGross)} gross
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--color-pewter)' }}
              axisLine={{ stroke: 'var(--color-steel)' }}
              tickLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="units"
              tick={{ fontSize: 10, fill: 'var(--color-pewter)' }}
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
                if (name === 'Units Sold') return [`${value} vehicle(s)`, 'Delivered'];
                if (name === 'Gross Margin') return [formatCurrency(Number(value)), 'Gross Profit'];
                return [value, name];
              }}
            />
            <Bar
              yAxisId="units"
              dataKey="unitsSold"
              name="Units Sold"
              fill="#0EA5E9"
              radius={[3, 3, 0, 0]}
              maxBarSize={16}
            />
            {canViewMargin && (
              <Line
                yAxisId="gross"
                type="monotone"
                dataKey="grossMargin"
                name="Gross Margin"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10B981', strokeWidth: 1, stroke: '#FFFFFF' }}
                activeDot={{ r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary */}
      <div className="flex items-center justify-between text-xs text-pewter pt-2 border-t border-steel/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#0EA5E9]" />
            <span className="font-medium text-cream">Units Sold (Daily)</span>
          </div>
          {canViewMargin && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#10B981] rounded-full" />
              <span className="font-medium text-cream">Gross Profit Curve</span>
            </div>
          )}
        </div>
        <span className="font-mono text-[11px] text-pewter">Rolling 30-Day Window</span>
      </div>
    </div>
  );
}
