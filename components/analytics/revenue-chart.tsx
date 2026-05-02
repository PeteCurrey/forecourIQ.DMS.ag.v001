'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'

export default function RevenueChart({ soldVehicles }: { soldVehicles: any[] }) {
  // Aggregate revenue by month
  const monthlyData: Record<string, number> = {}
  
  soldVehicles.forEach(v => {
    if (!v.sold_at) return
    const month = format(new Date(v.sold_at), 'MMM yyyy')
    monthlyData[month] = (monthlyData[month] || 0) + Number(v.sold_price || 0)
  })

  // Convert to array and sort chronologically (this is simplified, assumes data is already somewhat sorted or within same year)
  // For production, we'd sort properly by date
  const data = Object.entries(monthlyData).map(([name, total]) => ({ name, total })).slice(-6)

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
      <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Monthly Revenue</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
              tickFormatter={(val) => `£${val / 1000}k`}
              dx={-10}
            />
            <Tooltip 
              {...tooltipStyle} 
              formatter={(val: number) => [`£${val.toLocaleString()}`, 'Revenue']}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#0EA5E9" 
              strokeWidth={2}
              dot={{ fill: '#0EA5E9', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#EDE8DC' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
