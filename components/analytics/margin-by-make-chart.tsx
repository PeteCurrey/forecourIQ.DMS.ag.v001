'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

export default function MarginByMakeChart({ soldVehicles }: { soldVehicles: any[] }) {
  // Aggregate avg margin by make
  const makeData: Record<string, { totalMargin: number, count: number }> = {}
  
  soldVehicles.forEach(v => {
    const totalCost = Number(v.purchase_price || 0) + Number(v.prep_cost || 0) + Number(v.transport_cost || 0)
    const margin = Number(v.sold_price || 0) - totalCost
    
    if (!makeData[v.make]) {
      makeData[v.make] = { totalMargin: 0, count: 0 }
    }
    makeData[v.make].totalMargin += margin
    makeData[v.make].count += 1
  })

  const data = Object.entries(makeData)
    .map(([name, stats]) => ({ 
      name, 
      avgMargin: Math.round(stats.totalMargin / stats.count) 
    }))
    .sort((a, b) => b.avgMargin - a.avgMargin)
    .slice(0, 8) // Top 8 makes

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

  return (
    <div className="bg-carbon border border-steel rounded-[2px] p-6 h-[400px] flex flex-col">
      <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Avg Gross Margin by Make</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2029" horizontal={false} />
            <XAxis 
              type="number"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#5C6478' }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(val) => `£${val / 1000}k`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fontFamily: 'var(--font-inter)', fontSize: 11, fill: '#EDE8DC' }} 
              axisLine={false} 
              tickLine={false}
              width={100}
            />
            <Tooltip 
              {...tooltipStyle} 
              formatter={(val: number) => [`£${val.toLocaleString()}`, 'Avg Margin']}
            />
            <Bar dataKey="avgMargin" radius={[0, 2, 2, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.avgMargin > 0 ? '#0EA5E9' : '#C94040'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
