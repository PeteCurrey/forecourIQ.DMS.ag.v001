'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { differenceInDays } from 'date-fns'

type Vehicle = {
  id: string
  created_at: string
  make: string
  status: string
}

export default function DashboardCharts({ vehicles }: { vehicles: Vehicle[] }) {
  const now = new Date()

  // Stock Aging Data
  const agingBuckets = [
    { name: '0-14d', count: 0, fill: '#3DB87A' },
    { name: '15-29d', count: 0, fill: '#5DB87A' },
    { name: '30-44d', count: 0, fill: '#D4922A' },
    { name: '45-59d', count: 0, fill: '#E07030' },
    { name: '60d+', count: 0, fill: '#C94040' },
  ]

  vehicles.forEach(v => {
    const days = differenceInDays(now, new Date(v.created_at))
    if (days < 15) agingBuckets[0].count++
    else if (days < 30) agingBuckets[1].count++
    else if (days < 45) agingBuckets[2].count++
    else if (days < 60) agingBuckets[3].count++
    else agingBuckets[4].count++
  })

  // Static lead pipeline data (would come from DB in production)
  const pipelineData = [
    { name: 'New', count: 8, fill: '#0EA5E9' },
    { name: 'Contacted', count: 5, fill: '#0EA5E9' },
    { name: 'Test Drive', count: 3, fill: '#0EA5E9' },
    { name: 'Offer', count: 2, fill: '#0EA5E9' },
    { name: 'Won', count: 4, fill: '#3DB87A' },
    { name: 'Lost', count: 2, fill: '#C94040' },
  ]

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
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Stock Aging */}
      <div className="xl:col-span-3 bg-carbon border border-steel rounded-[2px] p-6">
        <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Stock Aging</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={agingBuckets} barSize={32}>
            <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#5C6478' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#5C6478' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} formatter={(val: number) => [val, 'Vehicles']} />
            <Bar dataKey="count" radius={[1, 1, 0, 0]}>
              {agingBuckets.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lead Pipeline */}
      <div className="xl:col-span-2 bg-carbon border border-steel rounded-[2px] p-6">
        <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Lead Pipeline</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pipelineData} layout="vertical" barSize={16}>
            <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#5C6478' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis dataKey="name" type="category" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#5C6478' }} axisLine={false} tickLine={false} width={70} />
            <Tooltip {...tooltipStyle} formatter={(val: number) => [val, 'Leads']} />
            <Bar dataKey="count" radius={[0, 1, 1, 0]}>
              {pipelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
