'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface PipelineStage {
  name: string
  count: number
  fill?: string
}

export default function LeadPipelineChart({ pipelineData }: { pipelineData: PipelineStage[] }) {
  const totalLeads = pipelineData.reduce((sum, item) => sum + item.count, 0)

  const stageColors: Record<string, string> = {
    'New': '#0EA5E9',
    'Contacted': '#0284C7',
    'Test Drive': '#6366F1',
    'Offer': '#8B5CF6',
    'Won': '#16A34A',
    'Lost': '#DC2626',
  }

  const chartData = pipelineData.map(d => ({
    ...d,
    fill: stageColors[d.name] || '#0EA5E9',
  }))

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'var(--carbon)',
      border: '1px solid var(--steel)',
      borderRadius: '2px',
      fontFamily: 'var(--font-inter)',
      fontSize: '11px',
      color: 'var(--cream)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    cursor: { fill: 'var(--asphalt)' }
  }

  if (totalLeads === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-center p-4">
        <p className="font-inter text-xs text-pewter">No lead pipeline activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" barSize={11} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--pewter)' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" tick={{ fontFamily: 'var(--font-inter)', fontSize: 11, fill: 'var(--silver)' }} axisLine={false} tickLine={false} width={80} />
          <Tooltip {...tooltipStyle} formatter={(val: number) => [val, 'Leads']} />
          <Bar dataKey="count" radius={[0, 1, 1, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
