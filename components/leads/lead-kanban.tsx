'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { Flame, Clock, Calendar, User, CheckCircle2 } from 'lucide-react'
import { LeadRecord, calculateSLA } from '@/lib/services/lead-calc'

interface LeadKanbanProps {
  leads: LeadRecord[]
  setLeads: React.Dispatch<React.SetStateAction<LeadRecord[]>>
}

const PIPELINE_COLUMNS = [
  { id: 'new', label: 'New Enquiries', color: 'border-blue/40' },
  { id: 'contacted', label: 'Contacted', color: 'border-steel' },
  { id: 'qualified', label: 'Qualified', color: 'border-blue' },
  { id: 'appointment_booked', label: 'Appointment', color: 'border-warning/50' },
  { id: 'deal_ready', label: 'Deal Ready', color: 'border-positive/50' },
  { id: 'won', label: 'Won', color: 'border-positive' },
]

export default function LeadKanban({ leads, setLeads }: LeadKanbanProps) {
  const supabase = createClient()

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const leadId = draggableId
    const newStatus = destination.droppableId

    const previousLeads = [...leads]
    const updatedLeads = leads.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus as any } : lead
    )
    setLeads(updatedLeads)

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Lead moved to ${newStatus.replace('_', ' ')}`)
    } catch {
      toast.error('Failed to update lead status')
      setLeads(previousLeads)
    }
  }

  const getSourceStyle = (source: string) => {
    switch((source || '').toLowerCase()) {
      case 'website': return 'bg-blue/10 text-blue border-blue/20'
      case 'autotrader': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'motors': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'cargurus': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default: return 'bg-slate text-silver border-steel'
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 p-6 overflow-x-auto min-w-max pb-12">
        {PIPELINE_COLUMNS.map((column) => {
          const columnLeads = leads.filter(l => {
            if (column.id === 'new') return l.status === 'new' || l.status === 'unassigned'
            if (column.id === 'contacted') return l.status === 'contacted' || l.status === 'contact_attempted' || l.status === 'nurture'
            if (column.id === 'deal_ready') return l.status === 'deal_ready' || l.status === 'proposal_required'
            return l.status === column.id
          })

          return (
            <div key={column.id} className="w-[300px] flex flex-col bg-carbon/60 border border-steel rounded-[2px] h-full shrink-0">
              
              {/* Column Header */}
              <div className={cn("p-3 border-b bg-carbon flex items-center justify-between", column.color)}>
                <div className="flex items-center gap-2">
                  <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider">{column.label}</span>
                  <span className="font-mono text-[10px] bg-asphalt text-silver border border-steel px-1.5 py-0.2 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {/* Droppable Card List */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 overflow-y-auto space-y-3 transition-colors",
                      snapshot.isDraggingOver ? "bg-asphalt/60" : "bg-transparent"
                    )}
                  >
                    {columnLeads.map((lead, index) => {
                      const sla = calculateSLA(lead)
                      const salesperson = lead.profiles?.full_name || 'Unassigned'

                      return (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-carbon border border-steel p-3.5 rounded-[2px] transition-all hover:border-slate cursor-grab active:cursor-grabbing shadow-sm",
                                snapshot.isDragging && "border-blue shadow-lg bg-carbon/95 rotate-1",
                                lead.temperature === 'hot' && "border-l-2 border-l-positive"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <Link 
                                  href={`/leads/${lead.id}`}
                                  className="font-syne font-bold text-[13px] text-cream hover:text-blue transition-colors line-clamp-1"
                                >
                                  {lead.first_name} {lead.last_name}
                                </Link>
                                
                                {lead.temperature === 'hot' && (
                                  <span className="font-mono text-[9px] text-positive font-bold flex items-center gap-0.5">
                                    🔥 HOT
                                  </span>
                                )}
                              </div>

                              {lead.vehicles && (
                                <div className="p-2 bg-asphalt rounded-[2px] border border-steel/60 mb-2">
                                  <p className="font-inter text-xs text-cream truncate">
                                    {lead.vehicles.make} {lead.vehicles.model}
                                  </p>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="font-mono text-[10px] text-silver">{lead.vehicles.registration}</span>
                                    <span className="font-mono text-[10px] text-pewter">£{lead.vehicles.asking_price?.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] pt-1">
                                <span className={cn("font-mono px-1.5 py-0.5 border rounded-[2px] uppercase", getSourceStyle(lead.source))}>
                                  {lead.source}
                                </span>

                                <span className={cn(
                                  "font-mono flex items-center gap-0.5",
                                  sla.status === 'responded' ? "text-positive" :
                                  sla.status === 'overdue' ? "text-negative font-bold" : "text-pewter"
                                )}>
                                  <Clock size={10} /> {sla.label}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-pewter mt-2 pt-2 border-t border-steel/40">
                                <span className="font-inter truncate max-w-[120px]">{salesperson}</span>
                                <span className="font-mono">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
