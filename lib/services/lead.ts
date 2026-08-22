import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { CustomerService } from './customer'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { differenceInMinutes } from 'date-fns'
import {
  LeadStatus,
  LeadTemperature,
  LeadPriority,
  LeadChannel,
  LeadRecord,
  LeadCRM_KPIs,
  calculateSLA
} from './lead-calc'

export type {
  LeadStatus,
  LeadTemperature,
  LeadPriority,
  LeadChannel,
  LeadRecord,
  LeadCRM_KPIs
}
export {
  calculateSLA
}

export interface LeadFilters {
  status?: string
  temperature?: LeadTemperature
  priority?: LeadPriority
  source?: string
  channel?: LeadChannel
  assignedTo?: string
  search?: string
  followUpQueue?: 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'no_action'
}

export const LeadService = {
  calculateSLA,

  /**
   * List leads with multi-dimensional filtering, search, and queue segmentation.
   */
  async list(dealershipId: string, filters: LeadFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from('leads')
      .select(`
        *,
        vehicles (id, make, model, registration, year, asking_price, status, photos),
        customers (id, first_name, last_name, email, phone, marketing_consent),
        profiles:assigned_to (id, full_name, email)
      `)
      .eq('dealership_id', dealershipId)

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.temperature && filters.temperature !== 'unknown') {
      query = query.eq('temperature', filters.temperature)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.source && filters.source !== 'all') {
      query = query.eq('source', filters.source)
    }

    if (filters.channel) {
      query = query.eq('channel', filters.channel)
    }

    if (filters.assignedTo) {
      if (filters.assignedTo === 'unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', filters.assignedTo)
      }
    }

    const now = new Date()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString()

    if (filters.followUpQueue === 'overdue') {
      query = query.not('next_action_at', 'is', null).lt('next_action_at', now.toISOString()).not('status', 'in', '("won","lost","closed")')
    } else if (filters.followUpQueue === 'today') {
      query = query.gte('next_action_at', now.toISOString()).lte('next_action_at', todayEnd).not('status', 'in', '("won","lost","closed")')
    } else if (filters.followUpQueue === 'tomorrow') {
      query = query.gt('next_action_at', todayEnd).lte('next_action_at', tomorrowEnd).not('status', 'in', '("won","lost","closed")')
    } else if (filters.followUpQueue === 'no_action') {
      query = query.is('next_action_at', null).not('status', 'in', '("won","lost","closed")')
    }

    if (filters.search) {
      const term = filters.search.trim().toLowerCase()
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,subject.ilike.%${term}%`
      )
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    return (data || []) as LeadRecord[]
  },

  /**
   * Fetch single lead with complete relational context.
   */
  async getById(dealershipId: string, leadId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        vehicles (*),
        customers (*),
        profiles:assigned_to (id, full_name, email),
        call_logs (*),
        lead_status_history (*),
        lead_assignment_history (*)
      `)
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .single()

    if (error || !data) throw new NotFoundError('Lead')

    return data as LeadRecord & {
      call_logs?: any[]
      lead_status_history?: any[]
      lead_assignment_history?: any[]
    }
  },

  /**
   * Create a new unified lead with customer matching, auto-conversation, and SLA timestamping.
   */
  async create(dealershipId: string, payload: Partial<LeadRecord>, userId?: string) {
    if (!payload.first_name || (!payload.email && !payload.phone)) {
      throw new ValidationError('First name and either email or phone are required.')
    }

    const supabase = await createClient()

    // 1. Safe customer matching on normalized email or phone
    let customerId = payload.customer_id
    if (!customerId) {
      try {
        const customer = await CustomerService.findOrCreateFromLead(dealershipId, {
          first_name: payload.first_name,
          last_name: payload.last_name || undefined,
          email: payload.email ? payload.email.trim().toLowerCase() : undefined,
          phone: payload.phone ? payload.phone.trim() : undefined,
        })
        customerId = customer.id
      } catch (custErr) {
        console.warn('[LeadService] Customer matching notice:', custErr)
      }
    }

    const record = {
      dealership_id: dealershipId,
      customer_id: customerId || null,
      vehicle_id: payload.vehicle_id || null,
      location_id: payload.location_id || null,
      source: payload.source || 'website',
      source_reference: payload.source_reference || null,
      channel: payload.channel || 'web',
      status: payload.status || (payload.assigned_to ? 'new' : 'unassigned'),
      priority: payload.priority || 'normal',
      temperature: payload.temperature || 'unknown',
      first_name: payload.first_name,
      last_name: payload.last_name || '',
      email: payload.email ? payload.email.trim().toLowerCase() : null,
      phone: payload.phone ? payload.phone.trim() : null,
      subject: payload.subject || 'Vehicle Enquiry',
      message: payload.message || null,
      notes: payload.notes || null,
      finance_interest: Boolean(payload.finance_interest),
      part_ex_reg: payload.part_ex_reg || null,
      part_ex_mileage: payload.part_ex_mileage || null,
      part_ex_value: payload.part_ex_value || null,
      assigned_to: payload.assigned_to || null,
      received_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      next_action_at: payload.next_action_at || null,
      next_action_description: payload.next_action_description || null,
      metadata: payload.metadata || {},
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert(record)
      .select()
      .single()

    if (error) throw error

    // 2. Initial Status History
    await supabase.from('lead_status_history').insert({
      lead_id: lead.id,
      from_status: null,
      to_status: lead.status,
      reason: 'Lead enquiry created',
      changed_by: userId || null,
    })

    // 3. Create or attach unified conversation
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .insert({
          dealership_id: dealershipId,
          customer_id: customerId || null,
          lead_id: lead.id,
          channel: lead.channel,
          status: 'open',
          assigned_user_id: lead.assigned_to,
          subject: lead.subject,
          last_message_preview: lead.message ? lead.message.substring(0, 140) : 'New enquiry received',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      // If initial message supplied, create inbound message in conversation
      if (conversation && payload.message) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          dealership_id: dealershipId,
          direction: 'inbound',
          channel: lead.channel,
          sender_type: 'customer',
          sender_name: `${lead.first_name} ${lead.last_name}`.trim(),
          recipient: 'Dealership Sales',
          subject: lead.subject,
          body: payload.message,
          status: 'received',
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
        })
      }
    } catch (convErr) {
      console.warn('[LeadService] Conversation initialization notice:', convErr)
    }

    // 4. Audit Log
    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'lead.created',
      entity_type: 'lead',
      entity_id: lead.id,
      after: { source: lead.source, status: lead.status },
      source: payload.source === 'api' ? 'api' : 'web',
    })

    return lead as LeadRecord
  },

  /**
   * Update lead details, temperature, priority, or next action.
   */
  async update(dealershipId: string, leadId: string, updates: Partial<LeadRecord>, userId?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error
    return data as LeadRecord
  },

  /**
   * Transition lead status with audit history.
   */
  async updateStatus(
    dealershipId: string,
    leadId: string,
    newStatus: LeadStatus,
    userId?: string,
    reason?: string,
    closeNotes?: string
  ) {
    const supabase = await createClient()
    const current = await this.getById(dealershipId, leadId)

    const updates: Record<string, unknown> = {
      status: newStatus,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'won') updates.won_at = new Date().toISOString()
    if (newStatus === 'lost') {
      updates.lost_at = new Date().toISOString()
      updates.close_reason = reason || null
      updates.close_notes = closeNotes || null
    }
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error

    // Log status history
    await supabase.from('lead_status_history').insert({
      lead_id: leadId,
      from_status: current.status,
      to_status: newStatus,
      reason: reason || 'Pipeline status progression',
      changed_by: userId || null,
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: newStatus === 'won' ? 'lead.won' : newStatus === 'lost' ? 'lead.lost' : 'lead.status_changed',
      entity_type: 'lead',
      entity_id: leadId,
      before: { status: current.status },
      after: { status: newStatus },
    })

    return data as LeadRecord
  },

  /**
   * Reassign lead to a salesperson with audit history.
   */
  async assign(dealershipId: string, leadId: string, toUserId: string | null, assignedBy?: string) {
    const supabase = await createClient()
    const current = await this.getById(dealershipId, leadId)

    const newStatus = (!toUserId && current.status === 'new') ? 'unassigned' : current.status === 'unassigned' && toUserId ? 'new' : current.status

    const { data, error } = await supabase
      .from('leads')
      .update({
        assigned_to: toUserId,
        status: newStatus,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('lead_assignment_history').insert({
      lead_id: leadId,
      from_user_id: current.assigned_to || null,
      to_user_id: toUserId,
      assigned_by: assignedBy || null,
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: assignedBy,
      action: 'lead.assigned',
      entity_type: 'lead',
      entity_id: leadId,
      before: { assigned_to: current.assigned_to },
      after: { assigned_to: toUserId },
    })

    return data as LeadRecord
  },

  /**
   * Log an inbound or outbound telephone call against a lead.
   */
  async logCall(dealershipId: string, leadId: string, params: {
    userId?: string
    customerId?: string
    direction: 'inbound' | 'outbound'
    phoneNumber?: string
    durationSeconds?: number
    outcome: 'connected' | 'left_voicemail' | 'no_answer' | 'busy' | 'wrong_number' | 'call_back_requested'
    notes?: string
  }) {
    const supabase = await createClient()

    const { data: call, error } = await supabase
      .from('call_logs')
      .insert({
        dealership_id: dealershipId,
        lead_id: leadId,
        customer_id: params.customerId || null,
        user_id: params.userId || null,
        direction: params.direction,
        phone_number: params.phoneNumber || null,
        duration_seconds: params.durationSeconds || 0,
        outcome: params.outcome,
        notes: params.notes || null,
      })
      .select()
      .single()

    if (error) throw error

    // Update lead last activity
    await supabase
      .from('leads')
      .update({
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: params.userId,
      action: 'call.logged',
      entity_type: 'call_log',
      entity_id: call.id,
      after: { outcome: params.outcome, direction: params.direction },
    })

    return call
  },

  /**
   * Calculate live CRM KPIs strictly from genuine database records.
   */
  async getCRM_KPIs(dealershipId: string): Promise<LeadCRM_KPIs> {
    const supabase = await createClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, status, temperature, priority, received_at, first_response_at, next_action_at, assigned_to, created_at')
      .eq('dealership_id', dealershipId)

    if (error) throw error

    const list = leads || []

    let newToday = 0
    let unassigned = 0
    let awaitingFirstResponse = 0
    let overdueFollowUps = 0
    let appointmentsBooked = 0
    let hotLeads = 0
    let qualified = 0
    let won = 0
    let lost = 0

    let totalResponseMinutes = 0
    let respondedCount = 0

    list.forEach(lead => {
      if (lead.created_at >= todayStart) newToday++
      if (!lead.assigned_to || lead.status === 'unassigned') unassigned++
      if (!lead.first_response_at && !['won', 'lost', 'closed'].includes(lead.status)) awaitingFirstResponse++
      if (lead.next_action_at && new Date(lead.next_action_at) < now && !['won', 'lost', 'closed'].includes(lead.status)) overdueFollowUps++
      if (lead.status === 'appointment_booked') appointmentsBooked++
      if (lead.temperature === 'hot' && !['won', 'lost', 'closed'].includes(lead.status)) hotLeads++
      if (lead.status === 'qualified' || lead.status === 'deal_ready') qualified++
      if (lead.status === 'won') won++
      if (lead.status === 'lost') lost++

      if (lead.first_response_at) {
        const received = new Date(lead.received_at || lead.created_at)
        const responded = new Date(lead.first_response_at)
        const mins = Math.max(0, differenceInMinutes(responded, received))
        totalResponseMinutes += mins
        respondedCount++
      }
    })

    const avgFirstResponseMinutes = respondedCount > 0 ? Math.round(totalResponseMinutes / respondedCount) : 0
    const totalProcessed = won + lost + qualified + appointmentsBooked
    const leadToAppointmentRate = list.length > 0 ? (appointmentsBooked / list.length) * 100 : 0
    const leadToDealRate = list.length > 0 ? (won / list.length) * 100 : 0

    return {
      newToday,
      unassigned,
      awaitingFirstResponse,
      overdueFollowUps,
      appointmentsBooked,
      hotLeads,
      qualified,
      won,
      lost,
      avgFirstResponseMinutes,
      leadToAppointmentRate,
      leadToDealRate,
    }
  },
}
