import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { NotFoundError, ValidationError } from '@/lib/errors'

export interface DealRecord {
  id: string
  dealership_id: string
  deal_number: number
  customer_id?: string
  vehicle_id?: string
  lead_id?: string
  salesperson_id?: string
  status: 'draft' | 'pending_approval' | 'deposit_paid' | 'finance_approved' | 'invoicing' | 'completed' | 'cancelled'
  sale_price: number
  discount_amount: number
  discount_approved_by?: string
  part_ex_vehicle_id?: string
  part_ex_allowance: number
  deposit_amount: number
  deposit_paid_at?: string
  payment_method?: string
  finance_type?: string
  finance_amount: number
  gross_margin?: number
  handover_date?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export const DealService = {
  async list(dealershipId: string, status?: string) {
    const supabase = await createClient()
    let query = supabase
      .from('deals')
      .select('*, customers(id, first_name, last_name), vehicles(id, make, model, registration)')
      .eq('dealership_id', dealershipId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(dealershipId: string, dealId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('deals')
      .select('*, customers(*), vehicles(*), profiles:salesperson_id(id, full_name)')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (error || !data) throw new NotFoundError('Deal')
    return data
  },

  async create(dealershipId: string, userId: string, payload: Partial<DealRecord>) {
    if (!payload.sale_price || payload.sale_price <= 0) {
      throw new ValidationError('Valid sale price is required for a deal.')
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('deals')
      .insert({
        ...payload,
        dealership_id: dealershipId,
        salesperson_id: payload.salesperson_id || userId,
        status: payload.status || 'draft',
      })
      .select()
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.created',
      entity_type: 'deal',
      entity_id: data.id,
      after: data,
    })

    return data as DealRecord
  }
}
