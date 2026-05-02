'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface LeadTableProps {
  leads: any[]
}

export default function LeadTable({ leads }: LeadTableProps) {
  const router = useRouter()

  const getSourceStyle = (source: string) => {
    switch(source.toLowerCase()) {
      case 'website': return "bg-blue/10 text-blue border-blue/20"
      case 'autotrader': return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case 'ebay': return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default: return "bg-slate text-silver border-steel"
    }
  }

  const getStatusStyle = (status: string) => {
    switch(status.toLowerCase()) {
      case 'new': return "default"
      case 'won': return "positive"
      case 'lost': return "negative"
      default: return "secondary"
    }
  }

  return (
    <div className="w-full overflow-x-auto pb-20">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-carbon border-b border-steel">
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Name</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Vehicle</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Source</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Status</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Assigned</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Created</th>
            <th className="py-3 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr 
              key={lead.id} 
              className="border-b border-steel hover:bg-carbon cursor-pointer transition-colors"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <td className="py-4 px-4">
                <p className="font-syne font-bold text-[14px] text-cream">{lead.first_name} {lead.last_name}</p>
                <div className="flex gap-3 mt-1">
                  {lead.email && <p className="font-inter text-[12px] text-silver">{lead.email}</p>}
                  {lead.phone && <p className="font-mono text-[11px] text-silver">{lead.phone}</p>}
                </div>
              </td>
              <td className="py-4 px-4">
                {lead.vehicles ? (
                  <>
                    <p className="font-inter font-medium text-[13px] text-cream truncate max-w-[200px]">
                      {(lead.vehicles as any).make} {(lead.vehicles as any).model}
                    </p>
                    <p className="font-mono text-[11px] text-silver mt-0.5">{(lead.vehicles as any).registration}</p>
                  </>
                ) : (
                  <p className="font-inter text-[13px] text-pewter italic">No vehicle specified</p>
                )}
              </td>
              <td className="py-4 px-4">
                <span className={cn(
                  "font-mono text-[9px] px-2 py-1 border rounded-[2px] uppercase",
                  getSourceStyle(lead.source)
                )}>
                  {lead.source}
                </span>
                {lead.finance_interest && (
                  <span className="font-mono text-[9px] bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded-[2px] ml-2">FIN</span>
                )}
              </td>
              <td className="py-4 px-4">
                <Badge variant={getStatusStyle(lead.status) as any}>{lead.status}</Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-steel border border-asphalt flex items-center justify-center">
                    <span className="font-mono text-[9px] text-blue">
                      {lead.assigned?.full_name ? lead.assigned.full_name.charAt(0) : '?'}
                    </span>
                  </div>
                  <span className="font-inter text-[13px] text-silver">{lead.assigned?.full_name || 'Unassigned'}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <p className="font-mono text-[12px] text-cream">{format(new Date(lead.created_at), 'dd MMM yyyy')}</p>
                <p className="font-mono text-[10px] text-pewter">{format(new Date(lead.created_at), 'HH:mm')}</p>
              </td>
              <td className="py-4 px-4 text-right text-pewter">
                <ChevronRight size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && (
        <div className="py-12 text-center border-b border-steel">
          <p className="font-inter text-sm text-pewter">No leads found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
