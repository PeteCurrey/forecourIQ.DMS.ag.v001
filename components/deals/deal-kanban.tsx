'use client'

import React from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { DealRecord, DealStatus, calcAgreedPrice } from '@/lib/services/deal-calc'
import { toast } from 'sonner'
import Link from 'next/link'
import { Car, User, Calendar, CreditCard, Clock, AlertTriangle } from 'lucide-react'

interface DealKanbanProps {
  deals: DealRecord[]
  setDeals: React.Dispatch<React.SetStateAction<DealRecord[]>>
  canReadMargin?: boolean
}

const KANBAN_COLUMNS: { id: DealStatus; label: string; border: string }[] = [
  { id: 'draft', label: 'Draft / Quote', border: 'border-steel' },
  { id: 'negotiation', label: 'Negotiation', border: 'border-warning/40' },
  { id: 'agreed', label: 'Agreed', border: 'border-blue/50' },
  { id: 'awaiting_deposit', label: 'Deposit Due', border: 'border-warning/50' },
  { id: 'finance_pending', label: 'Finance Pending', border: 'border-blue/50' },
  { id: 'documentation', label: 'Documentation', border: 'border-blue/60' },
  { id: 'handover_ready', label: 'Handover Ready', border: 'border-positive/50' },
  { id: 'completed', label: 'Completed (Sold)', border: 'border-positive' },
]

export function DealKanban({ deals, setDeals, canReadMargin = false }: DealKanbanProps) {
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const dealId = draggableId
    const newStatus = destination.droppableId as DealStatus

    const previousDeals = [...deals]
    const updatedDeals = deals.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
    setDeals(updatedDeals)

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Deal moved to ${newStatus.replace('_', ' ')}`)
    } catch {
      toast.error('Failed to update deal status')
      setDeals(previousDeals)
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 select-none min-h-[600px]">
        {KANBAN_COLUMNS.map((column) => {
          const colDeals = deals.filter((d) => d.status === column.id)
          const totalValue = colDeals.reduce((sum, d) => sum + Number(d.agreed_vehicle_price || 0), 0)

          return (
            <div key={column.id} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-carbon/50 border border-steel rounded-[2px] overflow-hidden">
              {/* Column Header */}
              <div className={`p-3 bg-carbon border-b-2 ${column.border} flex items-center justify-between`}>
                <div>
                  <h3 className="font-syne font-bold text-xs uppercase tracking-wider text-cream">{column.label}</h3>
                  <span className="font-mono text-[10px] text-pewter">£{totalValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
                </div>
                <span className="font-mono text-xs font-bold text-blue bg-asphalt px-2 py-0.5 rounded-[2px] border border-steel">
                  {colDeals.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 space-y-2.5 overflow-y-auto ${
                      snapshot.isDraggingOver ? 'bg-blue/5' : ''
                    }`}
                  >
                    {colDeals.map((deal, index) => {
                      const agreed = calcAgreedPrice(deal.vehicle_retail_price, deal.discount_amount)
                      const depositPaid = Number(deal.deposit_paid || 0)
                      const depositRequired = Number(deal.deposit_required || 0)
                      const depositOutstanding = Math.max(0, depositRequired - depositPaid)

                      return (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`bg-asphalt border rounded-[2px] p-3 text-xs space-y-2 cursor-grab active:cursor-grabbing transition ${
                                dragSnapshot.isDragging
                                  ? 'border-blue shadow-lg bg-carbon rotate-1 scale-102'
                                  : 'border-steel hover:border-steel/80 hover:bg-carbon'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  href={`/deals/${deal.id}`}
                                  className="font-syne font-bold text-cream hover:text-blue transition block truncate"
                                >
                                  {deal.deal_reference || `DEAL #${deal.deal_number || deal.id.slice(0, 8)}`}
                                </Link>
                                <span className="font-mono font-bold text-blue text-[13px]">
                                  £{agreed.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                                </span>
                              </div>

                              {/* Customer */}
                              <div className="flex items-center gap-1.5 text-silver truncate">
                                <User size={12} className="text-pewter shrink-0" />
                                <span className="truncate">
                                  {deal.customers ? `${deal.customers.first_name} ${deal.customers.last_name}` : 'Unassigned Customer'}
                                </span>
                              </div>

                              {/* Vehicle */}
                              <div className="flex items-center gap-1.5 text-silver truncate">
                                <Car size={12} className="text-blue shrink-0" />
                                <span className="font-mono font-semibold text-cream">
                                  {deal.vehicles?.registration || 'No Vehicle'}
                                </span>
                                {deal.vehicles && (
                                  <span className="text-pewter truncate">
                                    · {deal.vehicles.make} {deal.vehicles.model}
                                  </span>
                                )}
                              </div>

                              {/* Deposit / Warning Badges */}
                              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-steel/30">
                                <span className="text-[10px] font-mono uppercase bg-carbon border border-steel px-1.5 py-0.2 rounded-[2px] text-pewter">
                                  {deal.payment_method}
                                </span>

                                {depositOutstanding > 0 && (
                                  <span className="text-[10px] font-mono bg-warning/10 border border-warning/30 px-1.5 py-0.2 rounded-[2px] text-warning flex items-center gap-1">
                                    Dep Due: £{depositOutstanding.toFixed(0)}
                                  </span>
                                )}

                                {deal.handover_at && (
                                  <span className="text-[10px] font-mono bg-blue/10 border border-blue/30 px-1.5 py-0.2 rounded-[2px] text-blue flex items-center gap-1">
                                    <Calendar size={10} /> {new Date(deal.handover_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
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
