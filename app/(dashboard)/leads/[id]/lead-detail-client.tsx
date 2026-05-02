'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatRegistration } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, Calendar, Save, Trash2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { LEAD_STATUSES } from '@/lib/constants'
import ActivityTimeline from '@/components/leads/activity-timeline'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LeadDetailClient({ lead, initialActivities }: { lead: any, initialActivities: any[] }) {
  const [status, setStatus] = useState(lead.status)
  const [notes, setNotes] = useState(lead.notes || '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [activities, setActivities] = useState(initialActivities)
  const supabase = createClient()

  // Subscribe to realtime activities
  useEffect(() => {
    const channel = supabase
      .channel(`activities:lead_id=eq.${lead.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `lead_id=eq.${lead.id}`
        },
        async (payload) => {
          // Fetch the full activity with creator name to add to state
          const { data } = await supabase
            .from('activities')
            .select(`*, creator:profiles!activities_created_by_fkey (id, full_name)`)
            .eq('id', payload.new.id)
            .single()
            
          if (data) {
            setActivities(prev => [data, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lead.id, supabase])

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id)

      if (error) throw error
      setStatus(newStatus)
      
      // Also log activity automatically
      await supabase.from('activities').insert({
        dealership_id: lead.dealership_id,
        lead_id: lead.id,
        vehicle_id: lead.vehicle_id,
        type: 'system',
        content: `Status changed to ${newStatus}`
      })
      
      toast.success(`Status updated to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes })
        .eq('id', lead.id)

      if (error) throw error
      toast.success('Notes saved')
    } catch (error) {
      toast.error('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const getSourceStyle = (source: string) => {
    switch(source.toLowerCase()) {
      case 'website': return "bg-blue/10 text-blue border-blue/20"
      case 'autotrader': return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case 'ebay': return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default: return "bg-slate text-silver border-steel"
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-carbon border-b border-steel sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads" className="text-pewter hover:text-cream transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-syne font-bold text-xl text-cream">
              {lead.first_name} {lead.last_name}
            </h1>
            <span className={cn(
              "font-mono text-[10px] px-2 py-1 border rounded-[2px] uppercase",
              getSourceStyle(lead.source)
            )}>
              {lead.source}
            </span>
            {lead.finance_interest && (
              <span className="font-mono text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded-[2px]">FINANCE</span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 text-negative border-negative/50 hover:bg-negative/10">
            <Trash2 size={14} /> DELETE
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px] mx-auto">
        
        {/* LEFT COLUMN - 5/12 */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Status Pipeline */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px]">
            <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Status Pipeline</h2>
            
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-3.5 top-2 bottom-4 w-px bg-steel"></div>
              
              {LEAD_STATUSES.filter(s => s.value !== 'lost').map((s, idx) => {
                const currentIndex = LEAD_STATUSES.findIndex(x => x.value === status)
                const thisIndex = LEAD_STATUSES.findIndex(x => x.value === s.value)
                const isCompleted = thisIndex < currentIndex && status !== 'lost'
                const isCurrent = s.value === status
                
                return (
                  <button 
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    disabled={status === 'lost'}
                    className={cn(
                      "flex items-center gap-4 group relative z-10 transition-colors text-left",
                      status === 'lost' ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                      isCompleted ? "bg-positive border-positive text-void" : 
                      isCurrent ? "bg-blue/20 border-blue text-blue" : 
                      "bg-carbon border-steel text-pewter group-hover:border-slate"
                    )}>
                      {isCompleted ? <div className="w-2 h-2 rounded-full bg-void" /> : 
                       isCurrent ? <div className="w-2.5 h-2.5 rounded-full bg-blue animate-pulse" /> : 
                       <div className="w-1.5 h-1.5 rounded-full bg-pewter" />}
                    </div>
                    <div>
                      <p className={cn(
                        "font-syne font-bold text-[14px]",
                        isCompleted ? "text-silver" : isCurrent ? "text-cream" : "text-pewter"
                      )}>
                        {s.label}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            
            {status !== 'won' && (
              <div className="mt-8 pt-6 border-t border-steel">
                <Button 
                  onClick={() => handleStatusChange('lost')} 
                  variant="outline" 
                  className={cn(
                    "w-full",
                    status === 'lost' ? "bg-negative/10 text-negative border-negative/50 hover:bg-negative/20" : "text-pewter border-steel hover:text-negative hover:border-negative/50"
                  )}
                >
                  {status === 'lost' ? 'CURRENTLY MARKED AS LOST' : 'MARK AS LOST'}
                </Button>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6">
            <div>
              <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-asphalt border border-steel flex items-center justify-center text-pewter">
                    <Mail size={14} />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-0.5">Email</p>
                    <a href={`mailto:${lead.email}`} className="font-inter text-[14px] text-blue hover:underline">{lead.email || 'Not provided'}</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-asphalt border border-steel flex items-center justify-center text-pewter">
                    <Phone size={14} />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-0.5">Phone</p>
                    <a href={`tel:${lead.phone}`} className="font-mono text-[14px] text-cream hover:text-blue transition-colors">{lead.phone || 'Not provided'}</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Interest */}
            <div className="pt-6 border-t border-steel">
              <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-4">Vehicle of Interest</h2>
              {lead.vehicles ? (
                <Link href={`/stock/${lead.vehicles.id}`} className="flex gap-4 p-3 bg-asphalt border border-steel rounded-[2px] hover:border-blue transition-colors group">
                  <div className="w-16 h-12 bg-carbon border border-steel rounded-[2px] overflow-hidden flex-shrink-0">
                    {lead.vehicles.photos && lead.vehicles.photos.length > 0 ? (
                      <img src={lead.vehicles.photos[lead.vehicles.primary_photo_index || 0]} alt="Vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-pewter"><ImageIcon size={16} /></div>
                    )}
                  </div>
                  <div>
                    <p className="font-syne font-bold text-[14px] text-cream group-hover:text-blue transition-colors">{lead.vehicles.make} {lead.vehicles.model}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="font-mono text-[10px] text-cream bg-carbon border border-steel px-1.5 py-0.5 rounded-[2px]">{formatRegistration(lead.vehicles.registration)}</span>
                      <span className="font-mono text-[12px] text-silver">{formatCurrency(lead.vehicles.asking_price)}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4 bg-asphalt border border-steel rounded-[2px] text-center">
                  <p className="font-inter text-sm text-pewter">General enquiry. No specific vehicle.</p>
                </div>
              )}
            </div>

            {/* Part Exchange */}
            {lead.part_ex_reg && (
              <div className="pt-6 border-t border-steel">
                <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-4">Part Exchange</h2>
                <div className="flex justify-between items-center p-3 bg-asphalt border border-steel rounded-[2px]">
                  <span className="font-mono text-[14px] text-cream bg-carbon border border-steel px-2 py-1 rounded-[2px] uppercase">
                    {formatRegistration(lead.part_ex_reg)}
                  </span>
                  <Button variant="outline" size="sm">LOOKUP DVLA</Button>
                </div>
              </div>
            )}
          </div>

          {/* Private Notes */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest">Private Notes</h2>
              <Button 
                onClick={handleSaveNotes} 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-blue hover:text-cream hover:bg-blue/20"
                disabled={isSavingNotes}
              >
                {isSavingNotes ? 'SAVING...' : 'SAVE NOTES'}
              </Button>
            </div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-40 bg-asphalt border border-steel rounded-[2px] p-4 font-inter text-sm text-cream placeholder:text-muted focus:outline-none focus:border-blue resize-none"
              placeholder="Add internal notes about this lead. Only visible to your team."
            />
          </div>

        </div>

        {/* RIGHT COLUMN - 7/12 */}
        <div className="lg:col-span-7">
          <ActivityTimeline 
            leadId={lead.id} 
            vehicleId={lead.vehicle_id} 
            dealershipId={lead.dealership_id}
            activities={activities} 
          />
        </div>
      </div>
    </div>
  )
}
