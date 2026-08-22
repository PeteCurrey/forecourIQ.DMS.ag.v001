'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Clock, Flame, AlertCircle, Phone, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LeadRecord, calculateSLA } from '@/lib/services/lead-calc'

interface LeadTableProps {
  leads: LeadRecord[]
}

export default function LeadTable({ leads }: LeadTableProps) {
  const router = useRouter()

  const getSourceStyle = (source: string) => {
    switch((source || '').toLowerCase()) {
      case 'website': return 'bg-blue/10 text-blue border-blue/20'
      case 'autotrader': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'motors': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'cargurus': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'phone': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default: return 'bg-slate text-silver border-steel'
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'won': return <Badge variant="positive">Won</Badge>
      case 'lost': return <Badge variant="negative">Lost</Badge>
      case 'deal_ready': return <Badge variant="blue" className="font-bold">Deal Ready</Badge>
      case 'qualified': return <Badge variant="blue">Qualified</Badge>
      case 'appointment_booked': return <Badge variant="warning">Appt Booked</Badge>
      case 'contacted': return <Badge variant="outline">Contacted</Badge>
      case 'unassigned': return <Badge variant="warning">Unassigned</Badge>
      case 'new': return <Badge variant="blue">New</Badge>
      default: return <Badge variant="secondary">{status.replace('_', ' ')}</Badge>
    }
  }

  return (
    <div className="w-full overflow-x-auto pb-20">
      <table className="w-full text-left border-collapse min-w-[950px]">
        <thead>
          <tr className="bg-carbon border-b border-steel">
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Customer</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Vehicle</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Temp / Pri</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Source</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Status</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">SLA / Reply</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Assigned</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Received</th>
            <th className="py-3 px-4 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const sla = calculateSLA(lead)
            const salesperson = lead.profiles?.full_name || 'Unassigned'

            return (
              <tr 
                key={lead.id} 
                className="border-b border-steel hover:bg-carbon cursor-pointer transition-colors"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <td className="py-3.5 px-4">
                  <p className="font-syne font-bold text-[13px] text-cream">{lead.first_name} {lead.last_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lead.email && <span className="font-inter text-[11px] text-silver truncate max-w-[160px]">{lead.email}</span>}
                    {lead.phone && <span className="font-mono text-[10px] text-pewter">{lead.phone}</span>}
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  {lead.vehicles ? (
                    <div>
                      <p className="font-inter font-medium text-[12px] text-cream truncate max-w-[180px]">
                        {lead.vehicles.make} {lead.vehicles.model}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-silver">{lead.vehicles.registration}</span>
                        <span className="font-mono text-[10px] text-pewter">£{lead.vehicles.asking_price?.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="font-inter text-xs text-pewter italic">General enquiry</span>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    {lead.temperature === 'hot' && (
                      <span className="font-mono text-[10px] text-positive flex items-center gap-0.5 font-bold" title="Hot Lead">
                        🔥 HOT
                      </span>
                    )}
                    {lead.temperature === 'warm' && (
                      <span className="font-mono text-[10px] text-warning flex items-center gap-0.5" title="Warm Lead">
                        ⚡ WARM
                      </span>
                    )}
                    {lead.temperature === 'cold' && (
                      <span className="font-mono text-[10px] text-pewter flex items-center gap-0.5" title="Cold Lead">
                        ❄️ COLD
                      </span>
                    )}
                    {lead.priority === 'urgent' && (
                      <Badge variant="negative" className="font-mono text-[9px] px-1 py-0 uppercase">URG</Badge>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <span className={cn(
                    "font-mono text-[9px] px-2 py-0.5 border rounded-[2px] uppercase",
                    getSourceStyle(lead.source)
                  )}>
                    {lead.source}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  {getStatusBadge(lead.status)}
                </td>

                <td className="py-3.5 px-4">
                  <span className={cn(
                    "font-mono text-[10px] flex items-center gap-1",
                    sla.status === 'responded' ? "text-positive" :
                    sla.status === 'overdue' ? "text-negative font-bold" :
                    sla.status === 'due_soon' ? "text-warning font-bold" : "text-pewter"
                  )}>
                    <Clock size={11} /> {sla.label}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-steel border border-asphalt flex items-center justify-center">
                      <span className="font-mono text-[9px] text-blue">
                        {salesperson.charAt(0)}
                      </span>
                    </div>
                    <span className="font-inter text-[12px] text-silver">{salesperson}</span>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <p className="font-mono text-[11px] text-cream">{format(new Date(lead.created_at), 'dd MMM')}</p>
                  <p className="font-mono text-[9px] text-pewter">{format(new Date(lead.created_at), 'HH:mm')}</p>
                </td>

                <td className="py-3.5 px-4 text-right text-pewter">
                  <ChevronRight size={15} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {leads.length === 0 && (
        <div className="py-16 text-center border-b border-steel">
          <p className="font-inter text-sm text-pewter">No leads found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
