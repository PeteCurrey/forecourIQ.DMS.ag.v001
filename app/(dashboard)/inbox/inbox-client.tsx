'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Mail, 
  Phone, 
  Globe, 
  MessageSquare, 
  Send, 
  Sparkles, 
  User, 
  Car, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  ChevronRight,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConversationRecord, MessageRecord } from '@/lib/services/conversation'
import { getStandardTemplates } from '@/lib/services/communication-templates'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

interface InboxClientProps {
  initialConversations: ConversationRecord[]
  teamMembers: { id: string; full_name: string; email?: string }[]
  currentUser: { id: string; full_name: string; role?: string }
  dealership?: { name?: string; city?: string; phone?: string } | null
}

export default function InboxClient({
  initialConversations,
  teamMembers = [],
  currentUser,
  dealership,
}: InboxClientProps) {
  const [conversations, setConversations] = useState<ConversationRecord[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id || null)
  const [activeConversation, setActiveConversation] = useState<ConversationRecord | null>(null)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'mine' | 'unassigned'>('all')

  // Composer
  const [composerMode, setComposerMode] = useState<'message' | 'internal_note'>('message')
  const [messageBody, setMessageBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [aiTone, setAiTone] = useState<'concise' | 'friendly' | 'professional' | 'detailed'>('professional')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Load conversation thread when selected
  useEffect(() => {
    let ignore = false

    if (selectedId) {
      const fetchThread = async () => {
        setIsLoadingThread(true)
        try {
          const res = await fetch(`/api/conversations/${selectedId}/messages`)
          if (res.ok) {
            const data = await res.json()
            if (!ignore) {
              setActiveConversation(data.conversation)
              setMessages(data.conversation.messages || [])
            }
          }
        } catch (err) {
          console.error('Failed to load thread:', err)
        } finally {
          if (!ignore) setIsLoadingThread(false)
        }
      }

      fetchThread()
    }

    return () => {
      ignore = true
    }
  }, [selectedId])

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (channelFilter !== 'all' && conv.channel !== channelFilter) return false
      if (filterType === 'unread' && conv.unread_count === 0) return false
      if (filterType === 'mine' && conv.assigned_user_id !== currentUser.id) return false
      if (filterType === 'unassigned' && conv.assigned_user_id) return false

      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const customerName = `${conv.customers?.first_name || ''} ${conv.customers?.last_name || ''}`.toLowerCase()
        const subject = (conv.subject || '').toLowerCase()
        const preview = (conv.last_message_preview || '').toLowerCase()
        if (!customerName.includes(term) && !subject.includes(term) && !preview.includes(term)) return false
      }

      return true
    })
  }, [conversations, channelFilter, filterType, search, currentUser.id])

  const templates = getStandardTemplates({
    customer_first_name: activeConversation?.customers?.first_name || 'Customer',
    customer_last_name: activeConversation?.customers?.last_name || '',
    vehicle_make: activeConversation?.leads?.vehicles?.make,
    vehicle_model: activeConversation?.leads?.vehicles?.model,
    registration: activeConversation?.leads?.vehicles?.registration,
    dealership_name: dealership?.name || 'Our Dealership',
    salesperson_name: currentUser.full_name,
  })

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageBody.trim() || !activeConversation) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: composerMode === 'internal_note' ? 'internal_note' : 'outbound',
          channel: activeConversation.channel || 'web',
          body: messageBody.trim(),
          recipient: activeConversation.customers?.email || activeConversation.customers?.phone || 'Customer',
          leadId: activeConversation.lead_id,
          customerId: activeConversation.customer_id,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setMessageBody('')
      toast.success(composerMode === 'internal_note' ? 'Internal note added' : 'Message dispatched')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateAIDraft = async () => {
    if (!activeConversation?.lead_id) {
      toast.error('AI draft requires an attached vehicle lead.')
      return
    }

    setIsGeneratingAI(true)
    try {
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: activeConversation.lead_id, tone: aiTone }),
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

  return (
    <div className="flex-1 flex h-[calc(100vh-56px)] overflow-hidden bg-void">
      
      {/* Left Pane: Conversation List */}
      <div className="w-80 md:w-96 border-r border-steel flex flex-col h-full bg-carbon shrink-0 overflow-hidden">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-steel space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-syne font-bold text-lg text-cream">Customer Inbox</h1>
            <Badge variant="blue" className="font-mono text-[10px]">
              {conversations.length} CONVERSATIONS
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter" size={14} />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-asphalt"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                "px-2.5 py-1 rounded-[2px] border transition-colors",
                filterType === 'all' ? "bg-blue text-cream border-blue font-bold" : "bg-asphalt text-pewter border-steel hover:text-silver"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={cn(
                "px-2.5 py-1 rounded-[2px] border transition-colors",
                filterType === 'unread' ? "bg-blue text-cream border-blue font-bold" : "bg-asphalt text-pewter border-steel hover:text-silver"
              )}
            >
              Unread
            </button>
            <button
              onClick={() => setFilterType('mine')}
              className={cn(
                "px-2.5 py-1 rounded-[2px] border transition-colors",
                filterType === 'mine' ? "bg-blue text-cream border-blue font-bold" : "bg-asphalt text-pewter border-steel hover:text-silver"
              )}
            >
              Mine
            </button>
            <button
              onClick={() => setFilterType('unassigned')}
              className={cn(
                "px-2.5 py-1 rounded-[2px] border transition-colors",
                filterType === 'unassigned' ? "bg-blue text-cream border-blue font-bold" : "bg-asphalt text-pewter border-steel hover:text-silver"
              )}
            >
              Unassigned
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-steel/60">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedId
            const customerName = `${conv.customers?.first_name || 'Enquiry'} ${conv.customers?.last_name || ''}`.trim()
            const vehicle = conv.leads?.vehicles

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  "p-3.5 cursor-pointer transition-colors hover:bg-asphalt/60 text-xs space-y-1.5",
                  isSelected ? "bg-asphalt border-l-2 border-l-blue" : "bg-transparent"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="font-syne font-bold text-cream truncate max-w-[180px]">
                    {customerName}
                  </span>
                  <span className="font-mono text-[10px] text-pewter">
                    {formatDistanceToNow(new Date(conv.last_message_at || conv.created_at), { addSuffix: false })}
                  </span>
                </div>

                {vehicle && (
                  <p className="font-mono text-[11px] text-silver truncate">
                    🚗 {vehicle.make} {vehicle.model} ({vehicle.registration})
                  </p>
                )}

                <p className="font-inter text-pewter text-[11px] line-clamp-1">
                  {conv.last_message_preview || 'No messages'}
                </p>

                <div className="flex items-center justify-between pt-1 font-mono text-[9px]">
                  <span className="bg-steel/60 text-silver px-1.5 py-0.2 rounded-[2px] uppercase">
                    {conv.channel}
                  </span>
                  <span className="text-pewter truncate max-w-[120px]">
                    {conv.profiles?.full_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            )
          })}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-xs text-pewter">
              No conversations found.
            </div>
          )}
        </div>

      </div>

      {/* Right Pane: Active Conversation & Composer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-carbon/30">
        
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-4 bg-carbon border-b border-steel flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-syne font-bold text-base text-cream">
                    {activeConversation.customers?.first_name} {activeConversation.customers?.last_name}
                  </h2>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    {activeConversation.channel}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 font-mono text-xs text-silver">
                  {activeConversation.customers?.email && <span>✉️ {activeConversation.customers.email}</span>}
                  {activeConversation.customers?.phone && <span>📞 {activeConversation.customers.phone}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeConversation.lead_id && (
                  <Link href={`/leads/${activeConversation.lead_id}`} className="p-2 bg-asphalt border border-steel hover:border-slate rounded-[2px] text-xs font-mono text-blue flex items-center gap-1">
                    Open Lead Workspace <ChevronRight size={13} />
                  </Link>
                )}
                {activeConversation.customer_id && (
                  <Link href={`/customers/${activeConversation.customer_id}`} className="p-2 bg-asphalt border border-steel hover:border-slate rounded-[2px] text-xs font-mono text-cream flex items-center gap-1">
                    Customer File <ChevronRight size={13} />
                  </Link>
                )}
              </div>
            </div>

            {/* Thread Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingThread ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-blue" />
                </div>
              ) : (
                messages.map((msg) => {
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
                        <span className="font-bold uppercase tracking-wider text-cream">
                          {isNote ? '🔒 INTERNAL NOTE' : isCustomer ? `👤 ${msg.sender_name || 'Customer'}` : `💼 ${msg.sender_name || 'Salesperson'}`}
                        </span>
                        <span>{format(new Date(msg.created_at), 'dd MMM HH:mm')}</span>
                      </div>

                      <p className="font-inter whitespace-pre-line text-[13px] leading-relaxed text-cream">
                        {msg.body}
                      </p>
                    </div>
                  )
                })
              )}
            </div>

            {/* Composer */}
            <div className="p-4 bg-carbon border-t border-steel shrink-0 space-y-3">
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

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value)
                      const t = templates.find(item => item.id === e.target.value)
                      if (t) {
                        setMessageBody(t.body)
                        setComposerMode('message')
                      }
                    }}
                    className="bg-asphalt border border-steel rounded-[2px] px-2.5 py-1 font-mono text-xs text-cream max-w-[180px]"
                  >
                    <option value="">Insert Template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAIDraft}
                    disabled={isGeneratingAI || !activeConversation.lead_id}
                    className="gap-1 text-xs text-blue border-blue/30 hover:bg-blue/10"
                  >
                    {isGeneratingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    IQ Draft
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-2">
                <textarea
                  rows={3}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder={composerMode === 'internal_note' ? "Write internal sales notes here..." : "Write customer response..."}
                  className="w-full bg-asphalt border border-steel p-3 rounded-[2px] text-xs text-cream resize-none font-inter"
                />

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-pewter">
                    {composerMode === 'internal_note' ? "Dealership eyes only." : `Sending to customer via ${activeConversation.channel.toUpperCase()}`}
                  </span>

                  <Button type="submit" disabled={isSending || !messageBody.trim()} size="sm" className="gap-1.5 text-xs">
                    {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {composerMode === 'internal_note' ? 'SAVE NOTE' : 'SEND REPLY'}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-pewter space-y-2">
            <MessageSquare size={32} className="text-steel" />
            <p className="font-inter text-sm">Select a conversation from the left to view customer communication.</p>
          </div>
        )}

      </div>

    </div>
  )
}
