import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { CustomerService } from './customer'
import { NotFoundError, ValidationError } from '@/lib/errors'

export interface LeadRecord {
  id: string
  dealership_id: string
  vehicle_id?: string | null
  customer_id?: string | null
  source: string
  status: 'new' | 'contacted' | 'test_drive' | 'offer' | 'won' | 'lost'
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  message?: string | null
  notes?: string | null
  finance_interest?: boolean
  part_ex_reg?: string | null
  part_ex_mileage?: number | null
  part_ex_value?: number | null
  assigned_to?: string | null
  next_followup_at?: string | null
  last_contacted_at?: string | null
  won_at?: string | null
  lost_at?: string | null
  lost_reason?: string | null
  created_at: string
  updated_at: string
}

export const LeadService = {
  async list(dealershipId: string, status?: string) {
    const supabase = await createClient()
    let query = supabase
      .from('leads')
      .select('*, vehicles(id, make, model, registration, asking_price)')
      .eq('dealership_id', dealershipId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(dealershipId: string, leadId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*, vehicles(*), profiles(id, full_name)')
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .single()

    if (error || !data) throw new NotFoundError('Lead')
    return data
  },

  async create(dealershipId: string, payload: Partial<LeadRecord>) {
    if (!payload.first_name || (!payload.email && !payload.phone)) {
      throw new ValidationError('First name and either email or phone are required.')
    }

    const supabase = await createClient()

    // Automatically link or create a durable Customer record
    let customerId = payload.customer_id
    try {
      const customer = await CustomerService.findOrCreateFromLead(dealershipId, {
        first_name: payload.first_name,
        last_name: payload.last_name || undefined,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
      })
      customerId = customer.id
    } catch (custErr) {
      console.warn('[LeadService] Customer linking notice:', custErr)
    }

    const record = {
      ...payload,
      dealership_id: dealershipId,
      customer_id: customerId,
      status: payload.status || 'new',
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(record)
      .select()
      .single()

    if (error) throw error

    // Log activity and audit event
    await supabase.from('activities').insert({
      dealership_id: dealershipId,
      lead_id: data.id,
      vehicle_id: data.vehicle_id || null,
      type: 'system',
      content: `Lead captured (${payload.source || 'website'})`,
    })

    await AuditService.log({
      dealership_id: dealershipId,
      action: 'lead.created',
      entity_type: 'lead',
      entity_id: data.id,
      after: data,
      source: payload.source === 'api' ? 'api' : 'web',
    })

    return data as LeadRecord
  },

  async updateStatus(
    dealershipId: string,
    userId: string,
    leadId: string,
    newStatus: LeadRecord['status'],
    notes?: string
  ) {
    const supabase = await createClient()
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'won') updates.won_at = new Date().toISOString()
    if (newStatus === 'lost') updates.lost_at = new Date().toISOString()
    if (notes) updates.notes = notes

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: newStatus === 'won' ? 'lead.won' : newStatus === 'lost' ? 'lead.lost' : 'lead.status_changed',
      entity_type: 'lead',
      entity_id: leadId,
      after: { status: newStatus },
    })

    return data as LeadRecord
  }
}
