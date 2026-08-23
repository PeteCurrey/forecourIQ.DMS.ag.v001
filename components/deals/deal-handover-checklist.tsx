'use client'

import React, { useState } from 'react'
import { defaultHandoverChecklist } from '@/lib/services/deal-calc'
import { toast } from 'sonner'
import { CheckSquare, Square, Calendar, Car, AlertCircle, CheckCircle2 } from 'lucide-react'

interface DealHandoverChecklistProps {
  dealId: string
  handoverAt?: string | null
  existingChecklist?: Array<{ key: string; label: string; status: string; notes?: string }>
  vehiclePrepJobs?: Array<{ id: string; title: string; status: string }>
  onRefresh?: () => void
}

export function DealHandoverChecklist({
  dealId,
  handoverAt,
  existingChecklist,
  vehiclePrepJobs = [],
  onRefresh,
}: DealHandoverChecklistProps) {
  const [items, setItems] = useState(
    existingChecklist && existingChecklist.length > 0
      ? existingChecklist
      : defaultHandoverChecklist()
  )
  const [handoverDate, setHandoverDate] = useState(handoverAt ? handoverAt.split('T')[0] : '')
  const [saving, setSaving] = useState(false)

  const handleToggleItem = (index: number) => {
    const updated = [...items]
    updated[index].status = updated[index].status === 'complete' ? 'pending' : 'complete'
    setItems(updated)
  }

  const handleSaveChecklist = async () => {
    setSaving(true)
    try {
      // Update deal handover date
      if (handoverDate) {
        await fetch(`/api/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handover_at: new Date(handoverDate).toISOString(),
          }),
        })
      }

      toast.success('Handover settings saved')
      if (onRefresh) onRefresh()
    } catch {
      toast.error('Failed to save handover settings')
    } finally {
      setSaving(false)
    }
  }

  const allPrepComplete =
    vehiclePrepJobs.length === 0 || vehiclePrepJobs.every((j) => j.status === 'completed')

  return (
    <div className="space-y-6 text-cream">
      <div>
        <h2 className="font-syne font-bold text-base uppercase tracking-wide">Handover Readiness & Checklist</h2>
        <p className="text-xs text-pewter">
          Ensure preparation jobs, identity verification, and documentation are complete before handover.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Handover Date & Vehicle Prep Status */}
        <div className="space-y-4">
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-steel/60">
              <Calendar size={16} className="text-blue" />
              <h3 className="font-syne font-bold text-xs uppercase text-cream">Scheduled Handover Date</h3>
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Select Target Handover Date</label>
              <input
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue text-xs"
              />
            </div>
          </div>

          {/* Vehicle Prep Integration */}
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-steel/60">
              <div className="flex items-center gap-2">
                <Car size={16} className="text-blue" />
                <h3 className="font-syne font-bold text-xs uppercase text-cream">Vehicle Workshop Prep Status</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase ${
                  allPrepComplete
                    ? 'bg-positive/20 text-positive border border-positive/40'
                    : 'bg-warning/20 text-warning border border-warning/40'
                }`}
              >
                {allPrepComplete ? 'Prep Complete' : 'In Preparation'}
              </span>
            </div>

            {vehiclePrepJobs.length === 0 ? (
              <p className="text-xs text-pewter">No workshop preparation jobs assigned to this vehicle.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {vehiclePrepJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-1 border-b border-steel/20 last:border-0">
                    <span className="text-silver">{job.title}</span>
                    <span className="font-mono text-[10px] text-pewter uppercase">{job.status.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Handover Tasks Checklist */}
        <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-steel/60">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-blue" />
              <h3 className="font-syne font-bold text-xs uppercase text-cream">Handover Procedure Checklist</h3>
            </div>
            <span className="font-mono text-[11px] text-pewter">
              {items.filter((i) => i.status === 'complete').length} / {items.length} Completed
            </span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const isDone = item.status === 'complete'
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggleItem(idx)}
                  className={`flex items-center gap-3 p-2.5 rounded-[2px] border cursor-pointer transition text-xs ${
                    isDone
                      ? 'bg-positive/10 border-positive/30 text-cream'
                      : 'bg-asphalt border-steel text-silver hover:border-steel/80'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-positive shrink-0" />
                  ) : (
                    <Square size={16} className="text-pewter shrink-0" />
                  )}
                  <span className={isDone ? 'line-through text-pewter' : 'font-medium'}>{item.label}</span>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-steel/60 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveChecklist}
              className="bg-blue hover:bg-blue/90 text-cream px-4 py-1.5 rounded-[2px] text-xs font-medium transition"
            >
              Save Handover Status
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
