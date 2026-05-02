'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { format, differenceInDays } from 'date-fns'

export default function StockTurnChart({ soldVehicles }: { soldVehicles: any[] }) {
  // Aggregate avg days to sell by month
  const monthlyData: Record<string, { totalDays: number, count: number }> = {}
  
  soldVehicles.forEach(v => {
    if (!v.sold_at || !v.created_at) return
    const month = format(new Date(v.sold_at), 'MMM yy')
    const days = differenceInDays(new Date(v.sold_at), new Date(v.created_at))
    
    if (!monthlyData[month]) {
      monthlyData[month] = { totalDays: 0, count: 0 }
    }
    monthlyData[month].totalDays += days
    monthlyData[month].count += 1
  })

  const data = Object.entries(monthlyData).map(([name, stats]) => ({ 
    name, 
    avgDays: Math.round(stats.totalDays / stats.count) 
  })).slice(-6)

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#0D0F14',
      border: '1px solid #1C2029',
      borderRadius: '2px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: '#9DA8B7',
    },
    cursor: { fill: 'rgba(255,255,255,0.02)' }
  }

  const getBarColor = (days: number) => {
    if (days < 25) return '#3DB87A'
    if (days < 45) return '#D4922A'
    return '#C94040'
  }

  return (
    <div className="bg-carbon border border-steel rounded-[2px] p-6 h-[400px] flex flex-col">
      <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Avg Days to Sell</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2029" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#5C6478' }} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#5C6478' }} 
              axisLine={false} 
              tickLine={false}
            />
            <Tooltip 
              {...tooltipStyle} 
              formatter={(val: number) => [`${val} days`, 'Average']}
            />
            <Bar dataKey="avgDays" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.avgDays)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
