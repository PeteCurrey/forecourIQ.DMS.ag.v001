import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { NotFoundError, ValidationError } from '@/lib/errors'

export interface CustomerRecord {
  id: string
  dealership_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  county?: string | null
  postcode?: string | null
  preferred_contact_method?: string | null
  marketing_consent?: boolean | null
  marketing_consent_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  leads?: { id: string; status: string; vehicle_id?: string; created_at: string }[] | null
  deals?: { id: string; deal_number: number; status: string; sale_price: number }[] | null
  appointments?: { id: string; title: string; start_at: string; status: string }[] | null
  tasks?: { id: string; title: string; status: string; due_at: string }[] | null
}

export interface ConsentEventRecord {
  id: string
  dealership_id: string
  customer_id: string
  consent_type: string
  status: 'granted' | 'withdrawn'
  source: string
  ip_address?: string | null
  user_agent?: string | null
  recorded_by?: string | null
  created_at: string
}

export const CustomerService = {
  async list(dealershipId: string, search?: string) {
    const supabase = await createClient()
    let query = supabase
      .from('customers')
      .select('*, leads(id, status), deals(id, status, sale_price)')
      .eq('dealership_id', dealershipId)

    if (search) {
      const s = search.trim()
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data as CustomerRecord[]
  },

  async getById(dealershipId: string, customerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        leads(*),
        deals(*),
        appointments(*),
        tasks(*)
      `)
      .eq('dealership_id', dealershipId)
      .eq('id', customerId)
      .single()

    if (error || !data) throw new NotFoundError('Customer')
    return data as CustomerRecord
  },

  async create(dealershipId: string, userId: string, payload: Partial<CustomerRecord>) {
    if (!payload.first_name || !payload.last_name) {
      throw new ValidationError('First name and last name are required.')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...payload,
        dealership_id: dealershipId,
      })
      .select()
      .single()

    if (error) throw error

    // Log consent if granted
    if (payload.marketing_consent) {
      await supabase.from('customer_consent_events').insert({
        dealership_id: dealershipId,
        customer_id: data.id,
        consent_type: 'marketing_email',
        status: 'granted',
        source: 'dms_creation',
        recorded_by: userId,
      })
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'customer.created',
      entity_type: 'customer',
      entity_id: data.id,
      after: data,
    })

    return data as CustomerRecord
  },

  async update(dealershipId: string, userId: string, customerId: string, updates: Partial<CustomerRecord>) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('id', customerId)
      .select()
      .single()

    if (error || !data) throw new NotFoundError('Customer')

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'customer.updated',
      entity_type: 'customer',
      entity_id: customerId,
      after: data,
    })

    return data as CustomerRecord
  },

  async recordConsent(
    dealershipId: string,
    userId: string,
    customerId: string,
    consentType: string,
    status: 'granted' | 'withdrawn',
    source = 'dms'
  ) {
    const supabase = await createClient()

    await supabase.from('customer_consent_events').insert({
      dealership_id: dealershipId,
      customer_id: customerId,
      consent_type: consentType,
      status,
      source,
      recorded_by: userId,
    })

    await supabase
      .from('customers')
      .update({
        marketing_consent: status === 'granted',
        marketing_consent_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .eq('id', customerId)
  },

  /**
   * Find existing customer by email or phone, or create a new one.
   */
  async findOrCreateFromLead(
    dealershipId: string,
    leadData: { first_name: string; last_name?: string; email?: string; phone?: string }
  ): Promise<CustomerRecord> {
    const supabase = await createClient()

    if (leadData.email) {
      const cleanEmail = leadData.email.trim().toLowerCase()
      const { data: existingByEmail } = await supabase
        .from('customers')
        .select('*')
        .eq('dealership_id', dealershipId)
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (existingByEmail) return existingByEmail as CustomerRecord
    }

    if (leadData.phone) {
      const cleanPhone = leadData.phone.replace(/[\s\-\(\)]/g, '')
      const { data: existingByPhone } = await supabase
        .from('customers')
        .select('*')
        .eq('dealership_id', dealershipId)
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (existingByPhone) return existingByPhone as CustomerRecord
    }

    const { data: created, error } = await supabase
      .from('customers')
      .insert({
        dealership_id: dealershipId,
        first_name: leadData.first_name,
        last_name: leadData.last_name || 'Enquiry',
        email: leadData.email ? leadData.email.trim().toLowerCase() : null,
        phone: leadData.phone ? leadData.phone.trim() : null,
      })
      .select()
      .single()

    if (error) throw error
    return created as CustomerRecord
  }
}
