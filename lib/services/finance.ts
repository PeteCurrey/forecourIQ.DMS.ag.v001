import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import type { FinanceStatus } from '@/lib/services/deal-calc'

export type { FinanceStatus } from '@/lib/services/deal-calc'

export interface FinanceProposalRecord {
  id: string
  dealership_id: string
  deal_id: string
  customer_id?: string | null
  provider?: string | null
  product_type: 'hp' | 'pcp' | 'bch' | 'personal_loan' | 'other'
  vehicle_price: number
  deposit: number
  px_equity: number
  amount_to_finance: number
  term_months?: number | null
  annual_mileage?: number | null
  apr?: number | null
  monthly_payment?: number | null
  final_payment?: number | null
  status: FinanceStatus
  is_manually_recorded: boolean
  external_reference?: string | null
  notes?: string | null
  submitted_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateFinanceProposalPayload {
  provider?: string
  product_type?: FinanceProposalRecord['product_type']
  vehicle_price?: number
  deposit?: number
  px_equity?: number
  amount_to_finance?: number
  term_months?: number
  annual_mileage?: number
  apr?: number
  monthly_payment?: number
  final_payment?: number
  notes?: string
  external_reference?: string
}

export const FinanceService = {
  async getByDeal(dealershipId: string, dealId: string): Promise<FinanceProposalRecord[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('finance_proposals')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`FinanceService.getByDeal: ${error.message}`)
    return (data || []) as FinanceProposalRecord[]
  },

  /**
   * Create a finance proposal record.
   * All figures are manually provided — AI must never auto-populate financial terms.
   */
  async create(
    dealershipId: string,
    dealId: string,
    userId: string,
    payload: CreateFinanceProposalPayload
  ): Promise<FinanceProposalRecord> {
    const supabase = await createClient()

    const { data: deal } = await supabase
      .from('deals')
      .select('customer_id, status, part_exchange_equity')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!deal) throw new Error('Deal not found')
    if (deal.status === 'completed') throw new Error('Cannot add finance to completed deal')

    const { data, error } = await supabase
      .from('finance_proposals')
      .insert({
        dealership_id: dealershipId,
        deal_id: dealId,
        customer_id: deal.customer_id || null,
        provider: payload.provider || null,
        product_type: payload.product_type || 'hp',
        vehicle_price: Number(payload.vehicle_price || 0),
        deposit: Number(payload.deposit || 0),
        px_equity: Number(payload.px_equity ?? deal.part_exchange_equity ?? 0),
        amount_to_finance: Number(payload.amount_to_finance || 0),
        term_months: payload.term_months || null,
        annual_mileage: payload.annual_mileage || null,
        apr: payload.apr !== undefined ? Number(payload.apr) : null,
        monthly_payment: payload.monthly_payment !== undefined ? Number(payload.monthly_payment) : null,
        final_payment: payload.final_payment !== undefined ? Number(payload.final_payment) : null,
        status: 'discussion',
        is_manually_recorded: true,
        external_reference: payload.external_reference || null,
        notes: payload.notes || null,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(`FinanceService.create: ${error.message}`)

    // Update deal payment method to reflect finance
    await supabase.from('deals').update({
      finance_amount: Number(payload.amount_to_finance || 0),
      payment_method: 'finance',
      updated_at: new Date().toISOString(),
    }).eq('id', dealId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'finance.created',
      entity_type: 'finance_proposal',
      entity_id: data.id,
      after: { product_type: payload.product_type, provider: payload.provider, is_manually_recorded: true },
      source: 'web',
    })

    return data as FinanceProposalRecord
  },

  async updateStatus(
    dealershipId: string,
    proposalId: string,
    userId: string,
    status: FinanceStatus,
    notes?: string
  ): Promise<FinanceProposalRecord> {
    const supabase = await createClient()

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (notes) updatePayload.notes = notes
    if (status === 'submitted') updatePayload.submitted_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('finance_proposals')
      .update(updatePayload)
      .eq('dealership_id', dealershipId)
      .eq('id', proposalId)
      .select('*')
      .single()

    if (error) throw new Error(`FinanceService.updateStatus: ${error.message}`)

    // Update deal status to finance_pending if submitted
    if (status === 'submitted' || status === 'application_pending') {
      await supabase.from('deals')
        .update({ status: 'finance_pending', updated_at: new Date().toISOString() })
        .eq('dealership_id', dealershipId)
        .eq('id', data.deal_id)
        .in('status', ['agreed', 'reserved', 'awaiting_deposit'])
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'finance.status_changed',
      entity_type: 'finance_proposal',
      entity_id: proposalId,
      after: { status, notes },
      source: 'web',
    })

    return data as FinanceProposalRecord
  },
}
