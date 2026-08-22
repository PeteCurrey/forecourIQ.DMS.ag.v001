import { createClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { CommunicationService, CommunicationChannel, MessageDirection } from './communication'

export interface ConversationRecord {
  id: string
  dealership_id: string
  customer_id?: string | null
  lead_id?: string | null
  deal_id?: string | null
  channel: CommunicationChannel
  status: 'open' | 'waiting_customer' | 'waiting_dealer' | 'closed' | 'archived'
  assigned_user_id?: string | null
  subject?: string | null
  last_message_preview?: string | null
  last_message_at: string
  unread_count: number
  created_at: string
  updated_at: string
  customers?: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
  } | null
  leads?: {
    id: string
    source: string
    status: string
    vehicle_id?: string | null
    vehicles?: {
      id: string
      make: string
      model: string
      registration: string
      year: number
      asking_price: number
      photos?: string[] | null
    } | null
  } | null
  profiles?: {
    id: string
    full_name: string
  } | null
  messages?: MessageRecord[]
}

export interface MessageRecord {
  id: string
  conversation_id: string
  dealership_id: string
  direction: MessageDirection
  channel: CommunicationChannel
  sender_type: 'user' | 'customer' | 'system'
  sender_id?: string | null
  sender_name?: string | null
  recipient?: string | null
  subject?: string | null
  body: string
  status: 'draft' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received'
  failed_reason?: string | null
  external_message_id?: string | null
  sent_at: string
  delivered_at?: string | null
  read_at?: string | null
  metadata?: Record<string, unknown>
  created_at: string
}

export const ConversationService = {
  /**
   * List conversations for a dealership with optional channel/assigned filter.
   */
  async list(dealershipId: string, filter: { channel?: string; unreadOnly?: boolean; assignedUserId?: string } = {}) {
    const supabase = await createClient()

    let query = supabase
      .from('conversations')
      .select(`
        *,
        customers (id, first_name, last_name, email, phone),
        leads (id, source, status, vehicle_id, vehicles (id, make, model, registration, year, asking_price, photos)),
        profiles (id, full_name)
      `)
      .eq('dealership_id', dealershipId)

    if (filter.channel && filter.channel !== 'all') {
      query = query.eq('channel', filter.channel)
    }

    if (filter.unreadOnly) {
      query = query.gt('unread_count', 0)
    }

    if (filter.assignedUserId) {
      query = query.eq('assigned_user_id', filter.assignedUserId)
    }

    const { data, error } = await query.order('last_message_at', { ascending: false })
    if (error) throw error

    return (data || []) as ConversationRecord[]
  },

  /**
   * Fetch a single conversation with its complete chronological message thread.
   */
  async getById(dealershipId: string, conversationId: string) {
    const supabase = await createClient()

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        customers (id, first_name, last_name, email, phone, marketing_consent),
        leads (id, source, status, temperature, priority, next_action_at, vehicles (*)),
        profiles (id, full_name)
      `)
      .eq('dealership_id', dealershipId)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) throw new NotFoundError('Conversation')

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    return {
      ...conversation,
      messages: (messages || []) as MessageRecord[],
    } as ConversationRecord
  },

  /**
   * Get or create a unified conversation for a lead / customer.
   */
  async getOrCreateForLead(dealershipId: string, leadId: string, customerId?: string | null, channel: CommunicationChannel = 'web') {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('dealership_id', dealershipId)
      .eq('lead_id', leadId)
      .limit(1)
      .single()

    if (existing) {
      return this.getById(dealershipId, existing.id)
    }

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        dealership_id: dealershipId,
        lead_id: leadId,
        customer_id: customerId || null,
        channel,
        status: 'open',
        subject: 'Vehicle Enquiry',
        last_message_preview: 'Enquiry received',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return this.getById(dealershipId, created.id)
  },

  /**
   * Send a message or post an internal note.
   */
  async sendMessage(dealershipId: string, conversationId: string, params: {
    direction: MessageDirection
    channel: CommunicationChannel
    body: string
    userId?: string
    userName?: string
    recipient?: string
    subject?: string
    leadId?: string
    customerId?: string
  }) {
    return CommunicationService.sendMessage({
      dealership_id: dealershipId,
      conversation_id: conversationId,
      lead_id: params.leadId,
      customer_id: params.customerId,
      channel: params.channel,
      direction: params.direction,
      sender_type: params.direction === 'internal_note' ? 'user' : 'user',
      sender_id: params.userId,
      sender_name: params.userName,
      recipient: params.recipient,
      subject: params.subject,
      body: params.body,
    })
  },
}
