'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { LEAD_STATUSES } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

interface LeadKanbanProps {
  leads: any[]
  setLeads: React.Dispatch<React.SetStateAction<any[]>>
}

export default function LeadKanban({ leads, setLeads }: LeadKanbanProps) {
  const supabase = createClient()

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside a list
    if (!destination) return

    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const leadId = draggableId
    const newStatus = destination.droppableId

    // Optimistic UI update
    const previousLeads = [...leads]
    const updatedLeads = leads.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    )
    setLeads(updatedLeads)

    // Persist to database
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)

      if (error) throw error
    } catch (error) {
      toast.error('Failed to update lead status')
      setLeads(previousLeads) // Revert on failure
    }
  }

  // Get source badge styling
  const getSourceStyle = (source: string) => {
    switch(source.toLowerCase()) {
      case 'website': return "bg-[rgba(14,165,233,0.1)] text-[#0EA5E9] border-[#0EA5E9]/20"
      case 'autotrader': return "bg-[rgba(255,107,53,0.1)] text-[#FF6B35] border-[#FF6B35]/20"
      case 'ebay': return "bg-[rgba(26,115,232,0.1)] text-[#1A73E8] border-[#1A73E8]/20"
      default: return "bg-[rgba(92,100,120,0.1)] text-[#9DA8B7] border-[#5C6478]/20"
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full p-6 gap-4 items-start w-max min-w-full">
        {LEAD_STATUSES.map(status => {
          const columnLeads = leads.filter(l => l.status === status.value)
          
          return (
            <div key={status.value} className="w-[300px] flex-shrink-0 flex flex-col h-full max-h-full">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-syne font-bold text-[13px] text-cream uppercase tracking-wider">{status.label}</h3>
                <span className="font-mono text-[11px] text-pewter bg-asphalt px-2 py-0.5 rounded-[2px]">{columnLeads.length}</span>
              </div>
              
              {/* Column Body */}
              <Droppable droppableId={status.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "bg-carbon rounded-[2px] p-2 flex-1 overflow-y-auto min-h-[150px] border",
                      snapshot.isDraggingOver ? "border-blue/50 bg-blue/5" : "border-transparent"
                    )}
                  >
                    {columnLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                          >
                            <Link 
                              href={`/leads/${lead.id}`}
                              className={cn(
                                "block bg-asphalt border border-steel rounded-[2px] p-4 mb-2 hover:border-slate transition-colors cursor-grab active:cursor-grabbing",
                                snapshot.isDragging ? "shadow-xl border-blue z-50 rotate-2" : "",
                                status.value === 'won' ? "border-l-4 border-l-positive" : "",
                                status.value === 'lost' ? "opacity-60" : ""
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className={cn(
                                  "font-mono text-[9px] px-2 py-1 border rounded-[2px] uppercase",
                                  getSourceStyle(lead.source)
                                )}>
                                  {lead.source}
                                </span>
                                {lead.finance_interest && (
                                  <span className="font-mono text-[9px] bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded-[2px]">FIN</span>
                                )}
                              </div>
                              
                              <p className="font-syne font-bold text-[14px] text-cream mb-1 truncate">
                                {lead.first_name} {lead.last_name}
                              </p>
                              
                              <p className="font-inter text-[12px] text-silver truncate mb-3">
                                {lead.vehicles ? `${(lead.vehicles as any).make} ${(lead.vehicles as any).model}` : 'No vehicle selected'}
                              </p>
                              
                              <div className="flex justify-between items-center mt-auto border-t border-steel pt-3">
                                <div className="flex -space-x-1">
                                  {/* Just a placeholder avatar since we don't have real ones */}
                                  <div className="w-5 h-5 rounded-full bg-steel border border-asphalt flex items-center justify-center">
                                    <span className="font-mono text-[8px] text-blue">
                                      {lead.assigned?.full_name ? lead.assigned.full_name.charAt(0) : '?'}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-mono text-[10px] text-pewter">
                                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
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
