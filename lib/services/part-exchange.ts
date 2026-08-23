import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import type { PartExchangeRecord, DealAppraisal, SettlementStatus } from '@/lib/services/deal-calc'

export type { PartExchangeRecord } from '@/lib/services/deal-calc'

export interface CreatePartExchangePayload {
  registration: string
  vin?: string
  make?: string
  model?: string
  derivative?: string
  year?: number
  mileage?: number
  colour?: string
  fuel_type?: string
  transmission?: string
  condition?: string
  service_history?: string
  keys_count?: number
  mot_status?: string
  mot_expiry?: string
  warning_lights?: boolean
  notes?: string
  appraisal?: DealAppraisal
  photos?: string[]
  customer_expectation?: number
  trade_value?: number
  retail_estimate?: number
  allowance?: number
  finance_outstanding?: boolean
  finance_provider?: string
  settlement_amount?: number
}

export interface UpdatePartExchangePayload extends Partial<CreatePartExchangePayload> {
  valuation_by?: string
  valuation_provider?: string
  valuation_reference?: string
  valuation_at?: string
  settlement_reference?: string
  settlement_valid_until?: string
  settlement_status?: SettlementStatus
  status?: string
}

export const PartExchangeService = {
  async getByDeal(dealershipId: string, dealId: string): Promise<PartExchangeRecord[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('part_exchanges')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`PartExchangeService.getByDeal: ${error.message}`)
    return (data || []) as PartExchangeRecord[]
  },

  async create(
    dealershipId: string,
    dealId: string,
    userId: string,
    payload: CreatePartExchangePayload
  ): Promise<PartExchangeRecord> {
    const supabase = await createClient()

    // Validate deal belongs to dealership
    const { data: deal } = await supabase
      .from('deals')
      .select('id, customer_id, status')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!deal) throw new Error('Deal not found')
    if (deal.status === 'completed') throw new Error('Cannot add PX to a completed deal')

    const { data, error } = await supabase
      .from('part_exchanges')
      .insert({
        dealership_id: dealershipId,
        deal_id: dealId,
        customer_id: deal.customer_id || null,
        ...payload,
        allowance: Number(payload.allowance || 0),
        settlement_amount: Number(payload.settlement_amount || 0),
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(`PartExchangeService.create: ${error.message}`)

    // Update deal denormalised PX totals
    await PartExchangeService._recalcDealPXTotals(dealershipId, dealId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'part_exchange.created',
      entity_type: 'part_exchange',
      entity_id: data.id,
      after: { deal_id: dealId, registration: payload.registration },
      source: 'web',
    })

    return data as PartExchangeRecord
  },

  async update(
    dealershipId: string,
    pxId: string,
    userId: string,
    payload: UpdatePartExchangePayload
  ): Promise<PartExchangeRecord> {
    const supabase = await createClient()

    // Check deal is not completed
    const { data: px } = await supabase
      .from('part_exchanges')
      .select('deal_id, registration')
      .eq('dealership_id', dealershipId)
      .eq('id', pxId)
      .single()

    if (!px) throw new Error('Part exchange not found')

    const { data: deal } = await supabase
      .from('deals')
      .select('status')
      .eq('id', px.deal_id)
      .single()

    if (deal?.status === 'completed') throw new Error('Cannot modify PX on completed deal')

    const { data, error } = await supabase
      .from('part_exchanges')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('id', pxId)
      .select('*')
      .single()

    if (error) throw new Error(`PartExchangeService.update: ${error.message}`)

    // If valuation was updated, fire audit event
    if (payload.allowance !== undefined || payload.trade_value !== undefined) {
      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'part_exchange.valued',
        entity_type: 'part_exchange',
        entity_id: pxId,
        after: { allowance: payload.allowance, trade_value: payload.trade_value },
        source: 'web',
      })
    }

    if (payload.settlement_status || payload.settlement_amount !== undefined) {
      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'part_exchange.settlement_updated',
        entity_type: 'part_exchange',
        entity_id: pxId,
        after: { settlement_status: payload.settlement_status, settlement_amount: payload.settlement_amount },
        source: 'web',
      })
    }

    // Recalculate deal PX totals
    await PartExchangeService._recalcDealPXTotals(dealershipId, px.deal_id)

    return data as PartExchangeRecord
  },

  /**
   * Acquire a part exchange into stock.
   * Creates a new vehicle record with purchase_source = 'part_exchange'.
   */
  async acquireToStock(
    dealershipId: string,
    pxId: string,
    userId: string
  ): Promise<string> {
    const supabase = await createClient()

    const { data: px } = await supabase
      .from('part_exchanges')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('id', pxId)
      .single()

    if (!px) throw new Error('Part exchange not found')
    if (px.status === 'acquired_to_stock') throw new Error('Already acquired to stock')

    // Create vehicle record from PX data
    const { data: newVehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        dealership_id: dealershipId,
        registration: px.registration,
        vin: px.vin || null,
        make: px.make || 'Unknown',
        model: px.model || 'Unknown',
        variant: px.derivative || null,
        year: px.year || new Date().getFullYear(),
        mileage: px.mileage || 0,
        colour: px.colour || null,
        fuel_type: px.fuel_type || null,
        transmission: px.transmission || null,
        status: 'arrived',
        purchase_price: Number(px.allowance || 0),
        purchase_source: 'part_exchange',
        purchase_date: new Date().toISOString().split('T')[0],
        service_history: px.service_history || 'unknown',
        hpi_status: 'pending',
        condition: px.condition || 'unknown',
        internal_notes: `Acquired as part exchange on deal. PX ID: ${pxId}`,
        assigned_user_id: userId,
      })
      .select('id')
      .single()

    if (vehicleError) throw new Error(`Failed to create vehicle: ${vehicleError.message}`)

    // Update PX record
    await supabase.from('part_exchanges').update({
      status: 'acquired_to_stock',
      acquired_vehicle_id: newVehicle.id,
      updated_at: new Date().toISOString(),
    }).eq('id', pxId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'part_exchange.acquired',
      entity_type: 'part_exchange',
      entity_id: pxId,
      after: { acquired_vehicle_id: newVehicle.id },
      source: 'web',
    })

    return newVehicle.id
  },

  /**
   * Internal: recalculate and update denormalised PX totals on the deal.
   */
  async _recalcDealPXTotals(dealershipId: string, dealId: string): Promise<void> {
    const supabase = await createClient()

    const { data: pxRecords } = await supabase
      .from('part_exchanges')
      .select('allowance, settlement_amount')
      .eq('deal_id', dealId)
      .not('status', 'eq', 'rejected')

    const totalAllowance = (pxRecords || []).reduce((s, px) => s + Number(px.allowance || 0), 0)
    const totalSettlement = (pxRecords || []).reduce((s, px) => s + Number(px.settlement_amount || 0), 0)
    const equity = Math.round((totalAllowance - totalSettlement) * 100) / 100

    await supabase.from('deals').update({
      part_exchange_total: Math.round(totalAllowance * 100) / 100,
      part_exchange_settlement: Math.round(totalSettlement * 100) / 100,
      part_exchange_equity: equity,
      updated_at: new Date().toISOString(),
    }).eq('dealership_id', dealershipId).eq('id', dealId)
  },
}
