'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { Phone, Mail, MessageSquare, StickyNote, Car, FileText, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActivityTimelineProps {
  leadId: string
  vehicleId?: string
  dealershipId: string
  activities: any[]
}

export default function ActivityTimeline({ leadId, vehicleId, dealershipId, activities }: ActivityTimelineProps) {
  const [content, setContent] = useState('')
  const [type, setType] = useState('note')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const ACTIVITY_TYPES = [
    { value: 'call', label: 'Call', icon: Phone, color: 'text-positive' },
    { value: 'email', label: 'Email', icon: Mail, color: 'text-blue' },
    { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-silver' },
    { value: 'note', label: 'Note', icon: StickyNote, color: 'text-pewter' },
    { value: 'test_drive', label: 'Test Drive', icon: Car, color: 'text-warning' },
    { value: 'offer', label: 'Offer', icon: FileText, color: 'text-orange-500' },
  ]

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          dealership_id: dealershipId,
          lead_id: leadId,
          vehicle_id: vehicleId,
          type,
          content
        })

      if (error) throw error
      
      setContent('')
      toast.success('Activity logged')
    } catch (error) {
      toast.error('Failed to log activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={14} className="text-positive" />
      case 'email': return <Mail size={14} className="text-blue" />
      case 'sms': return <MessageSquare size={14} className="text-silver" />
      case 'note': return <StickyNote size={14} className="text-pewter" />
      case 'test_drive': return <Car size={14} className="text-warning" />
      case 'offer': return <FileText size={14} className="text-orange-500" />
      case 'system': return <Activity size={14} className="text-pewter" />
      default: return <StickyNote size={14} className="text-pewter" />
    }
  }

  return (
    <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      
      {/* Add Activity Form (Sticky Top) */}
      <div className="p-6 border-b border-steel bg-carbon shrink-0">
        <h2 className="font-syne font-bold text-lg text-cream mb-4">Log Activity</h2>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {ACTIVITY_TYPES.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-[2px] font-mono text-[11px] uppercase tracking-wider transition-colors border",
                  type === t.value 
                    ? "bg-blue/10 border-blue text-cream" 
                    : "bg-asphalt border-steel text-pewter hover:border-slate hover:text-silver"
                )}
              >
                <Icon size={12} className={type === t.value ? t.color : ""} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Log what happened... (Cmd+Enter to save)"
            className="w-full min-h-[100px] bg-asphalt border border-steel rounded-[2px] p-4 font-inter text-sm text-cream placeholder:text-muted focus:outline-none focus:border-blue resize-none"
          />
          <div className="absolute bottom-3 right-3">
            <Button 
              onClick={handleSubmit} 
              disabled={!content.trim() || isSubmitting}
              size="sm"
              className="h-8 font-syne font-bold tracking-widest text-[11px]"
            >
              {isSubmitting ? 'SAVING...' : 'LOG ACTIVITY'}
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0B0C10]">
        <h3 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6 sticky top-0 bg-[#0B0C10] py-2 z-10">Activity History</h3>
        
        <div className="space-y-6">
          {activities.length > 0 ? activities.map((activity, index) => {
            // Check if next activity is on a different day to show date separators
            const showDate = index === 0 || 
              format(new Date(activity.created_at), 'yyyy-MM-dd') !== 
              format(new Date(activities[index - 1].created_at), 'yyyy-MM-dd')

            return (
              <div key={activity.id}>
                {showDate && (
                  <div className="flex items-center gap-4 mb-6 mt-2">
                    <div className="h-px bg-steel flex-1"></div>
                    <span className="font-mono text-[10px] text-pewter uppercase">{format(new Date(activity.created_at), 'EEEE, dd MMM yyyy')}</span>
                    <div className="h-px bg-steel flex-1"></div>
                  </div>
                )}
                
                <div className="flex gap-4 relative">
                  {/* Vertical Line */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-[15px] top-[30px] bottom-[-24px] w-px bg-steel z-0"></div>
                  )}
                  
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-asphalt border border-steel flex items-center justify-center shrink-0 z-10">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-carbon border border-steel rounded-[2px] p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-pewter">
                          {activity.type.replace('_', ' ')}
                        </span>
                        {activity.type === 'system' && (
                          <span className="font-mono text-[9px] bg-asphalt px-1.5 py-0.5 rounded-[2px] text-silver border border-steel">SYSTEM</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-pewter" title={format(new Date(activity.created_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className={cn(
                      "font-inter text-[14px]",
                      activity.type === 'system' ? "text-silver italic" : "text-cream whitespace-pre-wrap"
                    )}>
                      {activity.content}
                    </p>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <span className="font-mono text-[10px] text-pewter">
                        By {activity.creator?.full_name || 'System'}
                      </span>
                      <span className="font-mono text-[10px] text-pewter">
                        {format(new Date(activity.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="text-center py-12 border border-dashed border-steel rounded-[2px]">
              <p className="font-inter text-sm text-pewter mb-2">No activity recorded yet.</p>
              <p className="font-inter text-xs text-muted">Log calls, emails, and notes above to track progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
