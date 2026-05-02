'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'

export default function LeadSourceChart({ leads }: { leads: any[] }) {
  // Aggregate leads by source
  const sourceCount: Record<string, number> = {}
  
  leads.forEach(l => {
    const source = l.source || 'Other'
    sourceCount[source] = (sourceCount[source] || 0) + 1
  })

  const data = Object.entries(sourceCount)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value)

  const COLORS = {
    'Website': '#0EA5E9',
    'Autotrader': '#3DB87A',
    'Ebay': '#D4922A',
    'Phone': '#9DA8B7',
    'Walk-in': '#5C6478',
    'Other': '#353D4C'
  }

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
    <div className="bg-carbon border border-steel rounded-[2px] p-6 h-[400px] flex flex-col">
      <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Lead Sources</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name] || COLORS.Other} />
              ))}
            </Pie>
            <RechartsTooltip {...tooltipStyle} formatter={(val: number) => [val, 'Leads']} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-silver font-inter text-[12px] ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
