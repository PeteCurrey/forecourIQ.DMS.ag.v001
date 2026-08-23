'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  User, 
  FileText, 
  Car, 
  Plus, 
  PhoneCall, 
  History, 
  Layers,
  ChevronRight,
  Loader2,
  Check,
  Tag,
  Handshake
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRegistration } from '@/lib/format'
import { LeadRecord, LeadStatus, LeadTemperature, LeadPriority, calculateSLA } from '@/lib/services/lead-calc'
import { ConversationRecord, MessageRecord } from '@/lib/services/conversation'
import { getStandardTemplates } from '@/lib/services/communication-templates'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

interface LeadDetailClientProps {
  lead: LeadRecord & { call_logs?: any[]; lead_status_history?: any[]; lead_assignment_history?: any[] }
  initialConversation: ConversationRecord
  teamMembers: { id: string; full_name: string; email?: string; role?: string }[]
  initialTasks: any[]
  initialAppointments: any[]
  currentUser: { id: string; full_name: string; role?: string }
  dealership?: { name?: string; city?: string; phone?: string } | null
}

const STATUS_OPTIONS: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'New Enquiry' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'contact_attempted', label: 'Contact Attempted' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'appointment_booked', label: 'Appointment Booked' },
  { id: 'appointment_completed', label: 'Appointment Completed' },
  { id: 'proposal_required', label: 'Proposal Required' },
  { id: 'deal_ready', label: 'Deal Ready' },
  { id: 'nurture', label: 'Nurture' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'closed', label: 'Closed' },
]

export default function LeadDetailClient({
  lead,
  initialConversation,
  teamMembers = [],
  initialTasks = [],
  initialAppointments = [],
  currentUser,
  dealership,
}: LeadDetailClientProps) {
  const router = useRouter()
  const [currentLead, setCurrentLead] = useState(lead)
  const [conversation, setConversation] = useState(initialConversation)
  const [messages, setMessages] = useState<MessageRecord[]>(initialConversation.messages || [])
  const [tasks, setTasks] = useState(initialTasks)
  const [appointments, setAppointments] = useState(initialAppointments)
  const [callLogs, setCallLogs] = useState(lead.call_logs || [])

  // Composer State
  const [composerMode, setComposerMode] = useState<'message' | 'internal_note'>('message')
  const [messageBody, setMessageBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [aiTone, setAiTone] = useState<'concise' | 'friendly' | 'professional' | 'detailed'>('professional')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // Next Action State
  const [nextActionDate, setNextActionDate] = useState(lead.next_action_at ? lead.next_action_at.split('T')[0] : '')
  const [nextActionDesc, setNextActionDesc] = useState(lead.next_action_description || '')
  const [isUpdatingAction, setIsUpdatingAction] = useState(false)

  // Call Logger Modal
  const [isLoggingCall, setIsLoggingCall] = useState(false)
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [callDuration, setCallDuration] = useState('120')
  const [callOutcome, setCallOutcome] = useState<'connected' | 'left_voicemail' | 'no_answer' | 'call_back_requested'>('connected')
  const [callNotes, setCallNotes] = useState('')
  const [isSavingCall, setIsSavingCall] = useState(false)

  // Quick Task Modal
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  // Quick Appointment Modal
  const [isAddingAppt, setIsAddingAppt] = useState(false)
  const [apptType, setApptType] = useState('test_drive')
  const [apptTime, setApptTime] = useState('')
  const [apptNotes, setApptNotes] = useState('')

  const sla = calculateSLA(currentLead)
  const templates = getStandardTemplates({
    customer_first_name: currentLead.first_name,
    customer_last_name: currentLead.last_name,
    vehicle_make: currentLead.vehicles?.make,
    vehicle_model: currentLead.vehicles?.model,
    registration: currentLead.vehicles?.registration,
    dealership_name: dealership?.name || 'ForecourIQ',
    salesperson_name: currentUser.full_name,
  })

  // Handle Status Progression
  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')
      const data = await res.json()
      setCurrentLead(prev => ({ ...prev, status: newStatus }))
      toast.success(`Pipeline status updated to ${newStatus.replace('_', ' ')}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  // Handle Assignment Change
  const handleAssignChange = async (toUserId: string) => {
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: toUserId || null }),
      })

      if (!res.ok) throw new Error('Failed to reassign lead')
      setCurrentLead(prev => ({ ...prev, assigned_to: toUserId || null }))
      toast.success('Lead salesperson reassigned')
    } catch {
      toast.error('Failed to reassign lead')
    }
  }

  // Handle Temperature Change
  const handleTempChange = async (temp: LeadTemperature) => {
    try {
      await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: temp }),
      })
      setCurrentLead(prev => ({ ...prev, temperature: temp }))
      toast.success(`Temperature set to ${temp}`)
    } catch {
      toast.error('Failed to update temperature')
    }
  }

  // Handle Priority Change
  const handlePriorityChange = async (p: LeadPriority) => {
    try {
      await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: p }),
      })
      setCurrentLead(prev => ({ ...prev, priority: p }))
      toast.success(`Priority set to ${p}`)
    } catch {
      toast.error('Failed to update priority')
    }
  }

  // Handle Next Action Update
  const handleSaveNextAction = async () => {
    setIsUpdatingAction(true)
    try {
      await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          next_action_at: nextActionDate ? new Date(nextActionDate).toISOString() : null,
          next_action_description: nextActionDesc || null,
        }),
      })
      setCurrentLead(prev => ({
        ...prev,
        next_action_at: nextActionDate ? new Date(nextActionDate).toISOString() : null,
        next_action_description: nextActionDesc || null,
      }))
      toast.success('Next action scheduled')
    } catch {
      toast.error('Failed to save next action')
    } finally {
      setIsUpdatingAction(false)
    }
  }

  // Handle Message or Note Send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageBody.trim()) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: composerMode === 'internal_note' ? 'internal_note' : 'outbound',
          channel: currentLead.channel || 'web',
          body: messageBody.trim(),
          recipient: currentLead.email || currentLead.phone || 'Customer',
          leadId: currentLead.id,
          customerId: currentLead.customer_id,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setMessageBody('')
      toast.success(composerMode === 'internal_note' ? 'Internal note added' : 'Message dispatched')
      if (composerMode === 'message') {
        setCurrentLead(prev => ({ ...prev, first_response_at: prev.first_response_at || new Date().toISOString() }))
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Handle AI Draft Reply Generation
  const handleGenerateAIDraft = async () => {
    setIsGeneratingAI(true)
    try {
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: currentLead.id, tone: aiTone }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate draft')
      }

      const data = await res.json()
      setMessageBody(data.draftReply)
      setComposerMode('message')
      toast.success('IQ Draft Reply generated (review and edit before sending)')
    } catch (err: any) {
      toast.error(err.message || 'Failed to draft AI response')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle Template Selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    const t = templates.find(item => item.id === templateId)
    if (t) {
      setMessageBody(t.body)
      setComposerMode('message')
    }
  }

  // Handle Call Logging
  const handleSaveCall = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingCall(true)
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: callDirection,
          phoneNumber: currentLead.phone,
          durationSeconds: Number(callDuration),
          outcome: callOutcome,
          notes: callNotes,
          customerId: currentLead.customer_id,
        }),
      })

      if (!res.ok) throw new Error('Failed to log call')
      const data = await res.json()
      setCallLogs(prev => [data.call, ...prev])
      setIsLoggingCall(false)
      setCallNotes('')
      toast.success('Phone call logged')
    } catch {
      toast.error('Failed to log call')
    } finally {
      setIsSavingCall(false)
    }
  }

  // Quick Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          due_date: taskDueDate || null,
          lead_id: currentLead.id,
          priority: 'normal',
        }),
      })

      if (!res.ok) throw new Error('Failed to create task')
      const data = await res.json()
      setTasks(prev => [data.task, ...prev])
      setIsAddingTask(false)
      setTaskTitle('')
      toast.success('Follow-up task created')
    } catch {
      toast.error('Failed to create task')
    }
  }

  // Quick Appointment Booking
  const handleCreateAppt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apptTime) return

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_type: apptType,
          start_time: new Date(apptTime).toISOString(),
          lead_id: currentLead.id,
          vehicle_id: currentLead.vehicle_id,
          customer_id: currentLead.customer_id,
          notes: apptNotes || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to book appointment')
      const data = await res.json()
      setAppointments(prev => [...prev, data.appointment])
      setIsAddingAppt(false)
      setApptNotes('')
      setCurrentLead(prev => ({ ...prev, status: 'appointment_booked' }))
      toast.success('Appointment scheduled')
    } catch {
      toast.error('Failed to schedule appointment')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-void">
      
      {/* Top Header */}
      <div className="bg-carbon border-b border-steel px-6 py-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <Link href="/leads" className="p-2 bg-asphalt border border-steel hover:border-slate rounded-[2px] text-pewter hover:text-cream transition-colors">
              <ArrowLeft size={16} />
            </Link>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-syne font-bold text-xl text-cream">
                  {currentLead.first_name} {currentLead.last_name}
                </h1>

                {/* Temperature selector */}
                <select
                  value={currentLead.temperature}
                  onChange={(e) => handleTempChange(e.target.value as LeadTemperature)}
                  className="bg-asphalt border border-steel rounded-[2px] px-2 py-0.5 font-mono text-xs text-cream"
                >
                  <option value="hot">🔥 HOT</option>
                  <option value="warm">⚡ WARM</option>
                  <option value="cold">❄️ COLD</option>
                  <option value="unknown">UNKNOWN</option>
                </select>

                {/* Priority selector */}
                <select
                  value={currentLead.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as LeadPriority)}
                  className="bg-asphalt border border-steel rounded-[2px] px-2 py-0.5 font-mono text-xs text-cream"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">🚨 Urgent Priority</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-silver font-mono">
                <span className="bg-blue/10 text-blue border border-blue/20 px-2 py-0.5 rounded-[2px] uppercase">
                  {currentLead.source} ({currentLead.channel})
                </span>
                
                <span className={cn(
                  "flex items-center gap-1 font-mono",
                  sla.status === 'responded' ? "text-positive" :
                  sla.status === 'overdue' ? "text-negative font-bold" : "text-warning font-bold"
                )}>
                  <Clock size={12} /> {sla.label}
                </span>

                <span className="text-pewter">
                  Received {format(new Date(currentLead.created_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Dropdown */}
            <select
              value={currentLead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="bg-asphalt border border-steel rounded-[2px] px-3 py-1.5 font-mono text-xs text-cream font-bold"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>

            {/* Salesperson Assignment */}
            <select
              value={currentLead.assigned_to || ''}
              onChange={(e) => handleAssignChange(e.target.value)}
              className="bg-asphalt border border-steel rounded-[2px] px-3 py-1.5 font-mono text-xs text-cream"
            >
              <option value="">Unassigned</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>

            {/* Log Call Button */}
            <Button variant="outline" size="sm" onClick={() => setIsLoggingCall(true)} className="gap-1.5 text-xs">
              <PhoneCall size={14} /> Log Call
            </Button>

            {/* Mark Deal Ready Button */}
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => handleStatusChange('deal_ready')}
              className={cn("gap-1.5 font-mono text-xs uppercase", currentLead.status === 'deal_ready' && "bg-positive/20 text-positive border-positive")}
            >
              <Sparkles size={14} /> {currentLead.status === 'deal_ready' ? 'DEAL READY ✓' : 'MARK DEAL READY'}
            </Button>

            {/* Structure Deal Button */}
            <Link
              href={`/deals/new?lead_id=${currentLead.id}&vehicle_id=${currentLead.vehicle_id || ''}&customer_id=${currentLead.customer_id || ''}`}
              className="inline-flex items-center gap-1.5 bg-blue hover:bg-blue/90 text-cream px-3 py-1.5 rounded-[2px] font-mono text-xs font-bold uppercase transition"
            >
              <Handshake size={14} /> Structure Deal
            </Link>
          </div>

        </div>
      </div>

      {/* Main Workspace Layout (2 columns) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* Left Column: Conversation Thread & Message Composer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full border-r border-steel bg-carbon/30 overflow-hidden">
          
          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => {
              const isCustomer = msg.direction === 'inbound'
              const isNote = msg.direction === 'internal_note'

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "p-4 rounded-[2px] border max-w-2xl text-xs space-y-2",
                    isNote ? "bg-warning/10 border-warning/30 ml-auto w-full text-cream" :
                    isCustomer ? "bg-carbon border-steel mr-auto" :
                    "bg-blue/10 border-blue/30 ml-auto"
                  )}
                >
                  <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-pewter border-b border-steel/40 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-cream flex items-center gap-1.5">
                      {isNote ? '🔒 INTERNAL NOTE' : isCustomer ? `👤 ${msg.sender_name || 'Customer'}` : `💼 ${msg.sender_name || 'Salesperson'}`}
                    </span>
                    <span>{format(new Date(msg.created_at), 'dd MMM HH:mm')}</span>
                  </div>

                  <p className="font-inter whitespace-pre-line text-[13px] leading-relaxed text-cream">
                    {msg.body}
                  </p>

                  {msg.status === 'failed' && (
                    <p className="font-mono text-[10px] text-negative pt-1">
                      Failed to dispatch: {msg.failed_reason}
                    </p>
                  )}
                </div>
              )
            })}

            {messages.length === 0 && (
              <div className="py-12 text-center text-pewter text-xs">
                No messages yet. Send an initial response below.
              </div>
            )}
          </div>

          {/* Composer Box */}
          <div className="p-4 bg-carbon border-t border-steel shrink-0 space-y-3">
            
            {/* Mode & Template & AI Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center bg-asphalt border border-steel rounded-[2px] p-0.5">
                <button
                  type="button"
                  onClick={() => setComposerMode('message')}
                  className={cn(
                    "px-3 py-1 text-xs font-mono rounded-[2px] transition-colors",
                    composerMode === 'message' ? "bg-blue text-cream font-bold" : "text-pewter hover:text-silver"
                  )}
                >
                  ✉️ Customer Reply
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode('internal_note')}
                  className={cn(
                    "px-3 py-1 text-xs font-mono rounded-[2px] transition-colors",
                    composerMode === 'internal_note' ? "bg-warning text-void font-bold" : "text-pewter hover:text-silver"
                  )}
                >
                  🔒 Internal Note
                </button>
              </div>

              {/* Template Picker */}
              <select
                value={selectedTemplate}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="bg-asphalt border border-steel rounded-[2px] px-2.5 py-1 font-mono text-xs text-cream max-w-[200px]"
              >
                <option value="">Insert Template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>

              {/* IQ Create AI Reply Assistant */}
              <div className="flex items-center gap-1.5">
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value as any)}
                  className="bg-asphalt border border-steel rounded-[2px] px-2 py-1 font-mono text-xs text-silver"
                >
                  <option value="concise">Concise</option>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="detailed">Detailed</option>
                </select>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAIDraft}
                  disabled={isGeneratingAI}
                  className="gap-1 text-xs text-blue border-blue/30 hover:bg-blue/10"
                >
                  {isGeneratingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  IQ Draft
                </Button>
              </div>
            </div>

            {/* Textarea */}
            <form onSubmit={handleSendMessage} className="space-y-2">
              <textarea
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={composerMode === 'internal_note' ? "Write internal sales notes here (never sent to customer)..." : "Write response to customer..."}
                className={cn(
                  "w-full p-3 rounded-[2px] border text-xs text-cream resize-none font-inter leading-relaxed focus:outline-none",
                  composerMode === 'internal_note' ? "bg-warning/5 border-warning/40 focus:border-warning" : "bg-asphalt border-steel focus:border-blue"
                )}
              />

              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-pewter">
                  {composerMode === 'internal_note' ? "Visible to internal dealership team only." : `Sending via ${currentLead.channel.toUpperCase()} to ${currentLead.email || currentLead.phone || 'Customer'}`}
                </p>

                <Button type="submit" disabled={isSending || !messageBody.trim()} size="sm" className="gap-1.5 text-xs">
                  {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {composerMode === 'internal_note' ? 'SAVE NOTE' : 'SEND REPLY'}
                </Button>
              </div>
            </form>

          </div>
        </div>

        {/* Right Column: Context Cards, Tasks, Appointments & Calls (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-y-auto p-6 space-y-6 bg-carbon/60">
          
          {/* Next Action Card */}
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-blue" /> Next Action Scheduled
              </span>
              <Button variant="ghost" size="sm" onClick={handleSaveNextAction} disabled={isUpdatingAction} className="h-7 text-xs">
                Save Action
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="h-8 text-xs bg-asphalt"
              />
              <Input
                placeholder="e.g. Call to discuss part-ex"
                value={nextActionDesc}
                onChange={(e) => setNextActionDesc(e.target.value)}
                className="h-8 text-xs bg-asphalt"
              />
            </div>
          </div>

          {/* Vehicle of Interest Card */}
          {currentLead.vehicles ? (
            <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
                  <Car size={14} className="text-blue" /> Vehicle of Interest
                </span>
                <Link href={`/stock/${currentLead.vehicles.id}`} className="font-mono text-xs text-blue hover:underline">
                  View Stock Record →
                </Link>
              </div>

              <div className="p-3 bg-asphalt border border-steel rounded-[2px] space-y-1.5">
                <p className="font-syne font-bold text-sm text-cream">
                  {currentLead.vehicles.make} {currentLead.vehicles.model}
                </p>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-silver">{currentLead.vehicles.registration} ({currentLead.vehicles.year})</span>
                  <span className="text-cream font-bold">£{currentLead.vehicles.asking_price?.toLocaleString()}</span>
                </div>
                <div className="pt-1">
                  <Badge variant={currentLead.vehicles.status === 'available' ? 'positive' : 'secondary'} className="font-mono text-[9px]">
                    {currentLead.vehicles.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-carbon border border-steel p-4 rounded-[2px]">
              <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
                <Car size={14} className="text-pewter" /> Vehicle of Interest
              </span>
              <p className="font-inter text-xs text-pewter mt-2">No specific vehicle attached to this enquiry.</p>
            </div>
          )}

          {/* Customer 360 Card */}
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-blue" /> Customer 360
              </span>
              {currentLead.customer_id && (
                <Link href={`/customers/${currentLead.customer_id}`} className="font-mono text-xs text-blue hover:underline">
                  Full Customer File →
                </Link>
              )}
            </div>

            <div className="space-y-2 text-xs font-inter">
              <div className="flex justify-between py-1 border-b border-steel/40">
                <span className="text-pewter">Name</span>
                <span className="text-cream font-medium">{currentLead.first_name} {currentLead.last_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-steel/40">
                <span className="text-pewter">Email</span>
                <span className="text-silver">{currentLead.email || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-steel/40">
                <span className="text-pewter">Phone</span>
                <span className="text-silver font-mono">{currentLead.phone || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-steel/40">
                <span className="text-pewter">GDPR Marketing</span>
                <span className={cn("font-mono text-[10px]", currentLead.customers?.marketing_consent ? "text-positive font-bold" : "text-pewter")}>
                  {currentLead.customers?.marketing_consent ? 'CONSENT GRANTED' : 'TRANSACTIONAL ONLY'}
                </span>
              </div>
            </div>
          </div>

          {/* Scheduled Appointments */}
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-blue" /> Appointments ({appointments.length})
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsAddingAppt(!isAddingAppt)} className="h-7 text-xs gap-1">
                <Plus size={12} /> Book Appt
              </Button>
            </div>

            {isAddingAppt && (
              <form onSubmit={handleCreateAppt} className="p-3 bg-asphalt border border-steel rounded-[2px] space-y-2">
                <select
                  value={apptType}
                  onChange={(e) => setApptType(e.target.value)}
                  className="w-full h-8 bg-carbon border border-steel rounded-[2px] px-2 font-mono text-xs text-cream"
                >
                  <option value="test_drive">Test Drive</option>
                  <option value="viewing">Vehicle Viewing</option>
                  <option value="handover">Vehicle Handover</option>
                  <option value="service">Service Drop-off</option>
                </select>
                <Input
                  type="datetime-local"
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="h-8 text-xs bg-carbon"
                  required
                />
                <Input
                  placeholder="Notes (optional)..."
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  className="h-8 text-xs bg-carbon"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingAppt(false)}>Cancel</Button>
                  <Button type="submit" size="sm">CONFIRM APPOINTMENT</Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {appointments.map(appt => (
                <div key={appt.id} className="p-2.5 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center text-xs">
                  <div>
                    <p className="font-inter font-medium text-cream capitalize">{appt.appointment_type.replace('_', ' ')}</p>
                    <p className="font-mono text-[10px] text-silver mt-0.5">{format(new Date(appt.start_time), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                  <Badge variant={appt.status === 'confirmed' ? 'positive' : 'outline'} className="font-mono text-[9px]">
                    {appt.status}
                  </Badge>
                </div>
              ))}
              {appointments.length === 0 && !isAddingAppt && (
                <p className="font-inter text-xs text-pewter">No appointments scheduled.</p>
              )}
            </div>
          </div>

          {/* Follow-up Tasks */}
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-blue" /> Tasks ({tasks.length})
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsAddingTask(!isAddingTask)} className="h-7 text-xs gap-1">
                <Plus size={12} /> Add Task
              </Button>
            </div>

            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="p-3 bg-asphalt border border-steel rounded-[2px] space-y-2">
                <Input
                  placeholder="Task description (e.g. Send valuation)..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="h-8 text-xs bg-carbon"
                  required
                />
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="h-8 text-xs bg-carbon"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingTask(false)}>Cancel</Button>
                  <Button type="submit" size="sm">CREATE TASK</Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="p-2.5 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center text-xs">
                  <span className={cn("font-inter", t.status === 'completed' && "line-through text-pewter")}>{t.title}</span>
                  <Badge variant={t.status === 'completed' ? 'secondary' : 'warning'} className="font-mono text-[9px]">
                    {t.status}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && !isAddingTask && (
                <p className="font-inter text-xs text-pewter">No open tasks.</p>
              )}
            </div>
          </div>

          {/* Call Logs History */}
          <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-3">
            <span className="font-syne font-bold text-xs text-cream uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall size={14} className="text-blue" /> Call Logs ({callLogs.length})
            </span>

            <div className="space-y-2">
              {callLogs.map(c => (
                <div key={c.id} className="p-2.5 bg-asphalt border border-steel rounded-[2px] text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-blue font-bold uppercase">{c.direction} CALL</span>
                    <span className="font-mono text-[10px] text-pewter">{format(new Date(c.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                  <p className="font-inter text-cream capitalize">Outcome: {c.outcome.replace('_', ' ')} ({c.duration_seconds}s)</p>
                  {c.notes && <p className="font-inter text-silver italic text-[11px]">{c.notes}</p>}
                </div>
              ))}
              {callLogs.length === 0 && (
                <p className="font-inter text-xs text-pewter">No calls recorded yet.</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Call Logger Modal */}
      {isLoggingCall && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCall} className="bg-carbon border border-steel p-6 rounded-[2px] max-w-md w-full space-y-4 animate-in fade-in">
            <h2 className="font-syne font-bold text-base text-cream">Log Telephone Call</h2>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase">Direction</label>
                <select
                  value={callDirection}
                  onChange={(e) => setCallDirection(e.target.value as any)}
                  className="w-full h-8 bg-asphalt border border-steel rounded-[2px] px-2.5 font-mono text-cream"
                >
                  <option value="outbound">Outbound (We called customer)</option>
                  <option value="inbound">Inbound (Customer called dealership)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase">Call Outcome</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value as any)}
                  className="w-full h-8 bg-asphalt border border-steel rounded-[2px] px-2.5 font-mono text-cream"
                >
                  <option value="connected">Connected & Spoke with Customer</option>
                  <option value="left_voicemail">Left Voicemail</option>
                  <option value="no_answer">No Answer</option>
                  <option value="call_back_requested">Call Back Requested</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase">Duration (Seconds)</label>
                <Input
                  type="number"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  className="h-8 bg-asphalt"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase">Call Notes</label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Summary of conversation..."
                  className="w-full bg-asphalt border border-steel p-2.5 rounded-[2px] text-xs text-cream resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-steel">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsLoggingCall(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSavingCall}>SAVE CALL LOG</Button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
