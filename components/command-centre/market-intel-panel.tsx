'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MarketIntelPanel({ marketData, stock }: { marketData: any[], stock: any[] }) {
  // Process stock into composition data
  const makeCount: Record<string, number> = {}
  stock.forEach(v => {
    makeCount[v.make] = (makeCount[v.make] || 0) + 1
  })

  const compositionData = Object.entries(makeCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5 makes

  // Add "Other" if needed
  const totalTop5 = compositionData.reduce((acc, curr) => acc + curr.value, 0)
  if (stock.length > totalTop5) {
    compositionData.push({ name: 'Other', value: stock.length - totalTop5 })
  }

  const COLORS = ['#0EA5E9', '#0284C7', '#0369A1', '#075985', '#EDE8DC', '#5C6478']

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#0D0F14',
      border: '1px solid #1C2029',
      borderRadius: '2px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: '#9DA8B7',
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Portfolio Composition */}
      <div className="bg-carbon border border-steel rounded-[2px] p-6">
        <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Stock Composition</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-40 h-40 shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip {...tooltipStyle} formatter={(val: number) => [val, 'Vehicles']} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-syne font-bold text-2xl text-cream leading-none">{stock.length}</span>
              <span className="font-mono text-[9px] text-pewter uppercase tracking-wider">Total</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-3">vs Regional Demand</p>
            <div className="space-y-2">
              {compositionData.slice(0, 4).map((item, index) => {
                const percentage = Math.round((item.value / stock.length) * 100)
                // Mock market percentage for demo
                const marketPct = Math.max(5, Math.round(percentage * (0.8 + Math.random() * 0.4)))
                const diff = percentage - marketPct
                
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="font-inter text-[13px] text-cream w-24 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[11px]">
                      <span className="text-silver w-8 text-right">{percentage}%</span>
                      <span className={cn(
                        "w-12 text-right flex items-center justify-end gap-1",
                        diff > 5 ? "text-warning" : diff < -5 ? "text-blue" : "text-pewter"
                      )}>
                        {diff > 0 ? '+' : ''}{diff}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Regional Demand Table */}
      <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
        <div className="p-6 border-b border-steel">
          <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest">East Midlands Demand</h2>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="bg-asphalt border-b border-steel">
              <th className="py-2 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider">Make / Model</th>
              <th className="py-2 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Avg Days</th>
              <th className="py-2 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Demand</th>
              <th className="py-2 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {marketData.map((row, i) => (
              <tr key={row.id} className={cn(
                "border-b border-steel hover:bg-asphalt/50 transition-colors",
                i % 2 === 0 ? "bg-void" : "bg-carbon"
              )}>
                <td className="py-3 px-6">
                  <p className="font-syne font-medium text-[13px] text-cream">{row.make} {row.model}</p>
                </td>
                <td className="py-3 px-6 text-right font-mono text-[12px]">
                  <span className={row.avg_days_to_sell < 30 ? "text-positive" : row.avg_days_to_sell > 45 ? "text-negative" : "text-warning"}>
                    {row.avg_days_to_sell}
                  </span>
                </td>
                <td className="py-3 px-6 text-right font-mono text-[13px] text-blue">
                  {row.demand_score}
                </td>
                <td className="py-3 px-6 flex justify-center">
                  {/* Mocking trend based on demand score for demo */}
                  {row.demand_score > 80 ? (
                    <ArrowUpRight size={14} className="text-positive" />
                  ) : row.demand_score < 40 ? (
                    <ArrowDownRight size={14} className="text-negative" />
                  ) : (
                    <ArrowRight size={14} className="text-pewter" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
