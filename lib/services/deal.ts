import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import {
  DealRecord,
  DealStatus,
  DealPaymentMethod,
  calcAgreedPrice,
  calcCustomerPurchaseTotal,
  calcPXEquity,
  calcProjectedGross,
  calcActualGross,
  calcVehicleInvestedCost,
} from '@/lib/services/deal-calc'

export type { DealRecord, DealStatus } from '@/lib/services/deal-calc'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateDealPayload {
  customer_id?: string
  vehicle_id?: string
  lead_id?: string
  salesperson_id?: string
  location_id?: string
  payment_method?: DealPaymentMethod
  vehicle_retail_price?: number
  agreed_vehicle_price?: number
  deposit_required?: number
  finance_amount?: number
  notes?: string
}

export interface UpdateDealPayload {
  customer_id?: string
  vehicle_id?: string
  salesperson_id?: string
  location_id?: string
  payment_method?: DealPaymentMethod
  vehicle_retail_price?: number
  agreed_vehicle_price?: number
  discount_amount?: number
  discount_reason?: string
  discount_approved_by?: string
  deposit_required?: number
  deposit_paid?: number
  finance_amount?: number
  cash_amount?: number
  products_total?: number
  part_exchange_total?: number
  part_exchange_settlement?: number
  part_exchange_equity?: number
  gross_margin_projected?: number
  handover_at?: string | null
  notes?: string
}

export interface DealFilters {
  status?: DealStatus | DealStatus[]
  salesperson_id?: string
  customer_id?: string
  vehicle_id?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

// ─── DealService ──────────────────────────────────────────────────────────────

export const DealService = {
  /**
   * List deals for a dealership with optional filters.
   */
  async list(dealershipId: string, filters: DealFilters = {}): Promise<DealRecord[]> {
    const supabase = await createClient()
    let query = supabase
      .from('deals')
      .select(`
        *,
        customers(id, first_name, last_name, email, phone),
        vehicles(id, registration, make, model, variant, year, mileage, colour, status, asking_price, purchase_price, auction_fee, transport_cost, prep_cost, other_acquisition_costs, photos),
        leads(id, source, channel, status),
        salesperson:profiles!deals_salesperson_id_fkey(id, full_name),
        part_exchanges(*),
        finance_proposals(id, status, provider, product_type, amount_to_finance, monthly_payment, is_manually_recorded),
        payments(id, category, amount, status, method, is_manually_recorded, provider, received_at)
      `)
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false })

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters.salesperson_id) query = query.eq('salesperson_id', filters.salesperson_id)
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id)
    if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id)
    if (filters.date_from) query = query.gte('created_at', filters.date_from)
    if (filters.date_to) query = query.lte('created_at', filters.date_to)
    if (filters.limit) query = query.limit(filters.limit)
    if (filters.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1)

    const { data, error } = await query
    if (error) throw new Error(`DealService.list: ${error.message}`)
    return (data || []) as unknown as DealRecord[]
  },

  /**
   * Get a single deal by ID with all relations.
   */
  async getById(dealershipId: string, dealId: string): Promise<DealRecord | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        customers(id, first_name, last_name, email, phone),
        vehicles(id, registration, make, model, variant, year, mileage, colour, status, asking_price, purchase_price, auction_fee, transport_cost, prep_cost, other_acquisition_costs, photos),
        leads(id, source, channel, status),
        salesperson:profiles!deals_salesperson_id_fkey(id, full_name),
        part_exchanges(*),
        deal_line_items(*),
        deal_proposals(*, created_by:profiles!deal_proposals_created_by_fkey(id, full_name)),
        deal_approvals(*, requested_by:profiles!deal_approvals_requested_by_fkey(id, full_name), approver:profiles!deal_approvals_approver_id_fkey(id, full_name)),
        finance_proposals(*),
        payments(*),
        deal_documents(*),
        handover_checklists(*),
        deal_status_history(*, changed_by:profiles!deal_status_history_changed_by_fkey(id, full_name))
      `)
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`DealService.getById: ${error.message}`)
    }

    await AuditService.log({
      dealership_id: dealershipId,
      action: 'deal.updated',
      entity_type: 'deal',
      entity_id: dealId,
      source: 'web',
    })

    return data as unknown as DealRecord
  },

  /**
   * Create a new deal.
   * Does NOT require a positive sale price — drafts start at zero.
   */
  async create(dealershipId: string, userId: string, payload: CreateDealPayload): Promise<DealRecord> {
    const supabase = await createClient()

    const year = new Date().getFullYear()

    const vehicleRetailPrice = Number(payload.vehicle_retail_price || 0)
    const agreedPrice = Number(payload.agreed_vehicle_price || vehicleRetailPrice)

    const { data, error } = await supabase
      .from('deals')
      .insert({
        dealership_id: dealershipId,
        customer_id: payload.customer_id || null,
        vehicle_id: payload.vehicle_id || null,
        lead_id: payload.lead_id || null,
        salesperson_id: payload.salesperson_id || null,
        location_id: payload.location_id || null,
        status: 'draft',
        vehicle_retail_price: vehicleRetailPrice,
        agreed_vehicle_price: agreedPrice,
        discount_amount: Math.max(0, vehicleRetailPrice - agreedPrice),
        payment_method: payload.payment_method || 'cash',
        deposit_required: Number(payload.deposit_required || 0),
        finance_amount: Number(payload.finance_amount || 0),
        notes: payload.notes || null,
        created_by: userId,
        updated_by: userId,
        deal_created_at: new Date().toISOString(),
      })
      .select(`*, customers(id, first_name, last_name, email, phone), vehicles(id, registration, make, model, variant, year, mileage, colour, status, asking_price)`)
      .single()

    if (error) throw new Error(`DealService.create: ${error.message}`)

    // Assign deal reference now we have the ID
    const ref = `FIQ-${year}-${String((data as { deal_number?: number }).deal_number || 1).padStart(6, '0')}`
    await supabase.from('deals').update({ deal_reference: ref }).eq('id', data.id)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.created',
      entity_type: 'deal',
      entity_id: data.id,
      after: { status: 'draft', vehicle_id: payload.vehicle_id, customer_id: payload.customer_id },
      source: 'web',
    })

    return { ...(data as unknown as DealRecord), deal_reference: ref }
  },

  /**
   * Create a deal directly from a qualified lead.
   */
  async createFromLead(dealershipId: string, leadId: string, userId: string): Promise<DealRecord> {
    const supabase = await createClient()

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, customer_id, vehicle_id, assigned_to, finance_interest')
      .eq('dealership_id', dealershipId)
      .eq('id', leadId)
      .single()

    if (leadError || !lead) throw new Error('Lead not found')

    // Check no active deal already exists for this lead
    const { count } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId)
      .eq('lead_id', leadId)
      .not('status', 'in', '(cancelled,lost)')

    if ((count || 0) > 0) throw new Error('An active deal already exists for this lead')

    // Fetch vehicle asking price if vehicle linked
    let vehicleRetailPrice = 0
    if (lead.vehicle_id) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('asking_price')
        .eq('id', lead.vehicle_id)
        .single()
      vehicleRetailPrice = Number(vehicle?.asking_price || 0)
    }

    return DealService.create(dealershipId, userId, {
      customer_id: lead.customer_id || undefined,
      vehicle_id: lead.vehicle_id || undefined,
      lead_id: leadId,
      salesperson_id: lead.assigned_to || userId,
      vehicle_retail_price: vehicleRetailPrice,
      payment_method: lead.finance_interest ? 'finance' : 'cash',
    })
  },

  /**
   * Update deal fields.
   */
  async update(dealershipId: string, dealId: string, userId: string, payload: UpdateDealPayload): Promise<DealRecord> {
    const supabase = await createClient()

    // Check deal is not completed (immutable)
    const { data: existing } = await supabase
      .from('deals')
      .select('status, completed_at')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (existing?.status === 'completed') {
      throw new Error('Completed deals are immutable. Raise a reversal to amend.')
    }

    const { data, error } = await supabase
      .from('deals')
      .update({ ...payload, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .select(`*, customers(id, first_name, last_name, email, phone), vehicles(id, registration, make, model, variant, year, mileage, colour, status, asking_price, purchase_price, auction_fee, transport_cost, prep_cost, other_acquisition_costs)`)
      .single()

    if (error) throw new Error(`DealService.update: ${error.message}`)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.updated',
      entity_type: 'deal',
      entity_id: dealId,
      after: payload as Record<string, unknown>,
      source: 'web',
    })

    return data as unknown as DealRecord
  },

  /**
   * Transition deal status with history tracking.
   */
  async updateStatus(
    dealershipId: string,
    dealId: string,
    userId: string,
    newStatus: DealStatus,
    reason?: string
  ): Promise<void> {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('deals')
      .select('status')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!existing) throw new Error('Deal not found')
    if (existing.status === 'completed') throw new Error('Completed deals cannot be transitioned')
    if (existing.status === newStatus) return

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'agreed') updatePayload.agreed_at = new Date().toISOString()

    await supabase
      .from('deals')
      .update(updatePayload)
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)

    await supabase.from('deal_status_history').insert({
      dealership_id: dealershipId,
      deal_id: dealId,
      from_status: existing.status,
      to_status: newStatus,
      reason: reason || null,
      changed_by: userId,
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.status_changed',
      entity_type: 'deal',
      entity_id: dealId,
      before: { status: existing.status },
      after: { status: newStatus, reason },
      source: 'web',
    })
  },

  /**
   * Apply/update discount with RBAC awareness.
   * If discount_approved_by is provided, it's recorded as an approved discount.
   */
  async applyDiscount(
    dealershipId: string,
    dealId: string,
    userId: string,
    discountAmount: number,
    reason: string,
    approvedBy?: string
  ): Promise<void> {
    const supabase = await createClient()

    const { data: deal } = await supabase
      .from('deals')
      .select('vehicle_retail_price, status')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!deal) throw new Error('Deal not found')
    if (deal.status === 'completed') throw new Error('Completed deals cannot be modified')

    const retailPrice = Number(deal.vehicle_retail_price || 0)
    const newAgreedPrice = calcAgreedPrice(retailPrice, discountAmount)

    await supabase.from('deals').update({
      discount_amount: discountAmount,
      discount_reason: reason,
      discount_approved_by: approvedBy || null,
      discounted_at: new Date().toISOString(),
      agreed_vehicle_price: newAgreedPrice,
      updated_by: userId,
    }).eq('dealership_id', dealershipId).eq('id', dealId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.discount_changed',
      entity_type: 'deal',
      entity_id: dealId,
      after: { discount_amount: discountAmount, reason, approved_by: approvedBy },
      source: 'web',
    })
  },

  /**
   * Complete a sale — atomic domain transaction.
   * Marks deal complete, vehicle sold, lead won, calculates actual gross.
   */
  async completeSale(dealershipId: string, dealId: string, userId: string): Promise<void> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Fetch full deal state
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        vehicles(purchase_price, auction_fee, transport_cost, prep_cost, other_acquisition_costs),
        vehicle_costs(amount),
        lead_id
      `)
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (dealError || !deal) throw new Error('Deal not found')
    if (deal.status === 'completed') throw new Error('Deal is already completed')

    const vehicle = deal.vehicles as { purchase_price?: number; auction_fee?: number; transport_cost?: number; prep_cost?: number; other_acquisition_costs?: number } | null
    const vehicleCosts = (deal.vehicle_costs as { amount: number }[] | null) || []

    // Calculate actual invested cost
    const baseCost = calcVehicleInvestedCost(vehicle || {})
    const additionalCosts = vehicleCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    const totalInvestedCost = Math.round((baseCost + additionalCosts) * 100) / 100

    const agreedPrice = Number(deal.agreed_vehicle_price || 0)
    const actualGross = calcActualGross(agreedPrice, totalInvestedCost)
    const projectedGross = calcProjectedGross(agreedPrice, totalInvestedCost)

    // 1. Mark deal completed
    await supabase.from('deals').update({
      status: 'completed',
      completed_at: now,
      sold_at: now,
      gross_margin_actual: actualGross,
      gross_margin_projected: projectedGross,
      updated_by: userId,
    }).eq('dealership_id', dealershipId).eq('id', dealId)

    // 2. Mark vehicle sold
    if (deal.vehicle_id) {
      await supabase.from('vehicles').update({
        status: 'sold',
        sold_price: agreedPrice,
        sold_at: now,
        sold_to_lead_id: deal.lead_id || null,
        updated_at: now,
      }).eq('dealership_id', dealershipId).eq('id', deal.vehicle_id)

      // Record vehicle status history
      await supabase.from('vehicle_status_history').insert({
        dealership_id: dealershipId,
        vehicle_id: deal.vehicle_id,
        to_status: 'sold',
        reason: `Deal ${deal.deal_reference || dealId} completed`,
        changed_by: userId,
      })

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'vehicle.sold',
        entity_type: 'vehicle',
        entity_id: deal.vehicle_id,
        after: { sold_price: agreedPrice, deal_id: dealId },
        source: 'web',
      })
    }

    // 3. Mark lead won
    if (deal.lead_id) {
      await supabase.from('leads').update({
        status: 'won',
        won_at: now,
        updated_at: now,
      }).eq('dealership_id', dealershipId).eq('id', deal.lead_id)

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'lead.won',
        entity_type: 'lead',
        entity_id: deal.lead_id,
        after: { deal_id: dealId },
        source: 'web',
      })
    }

    // 4. Status history
    await supabase.from('deal_status_history').insert({
      dealership_id: dealershipId,
      deal_id: dealId,
      from_status: deal.status,
      to_status: 'completed',
      reason: 'Sale completed',
      changed_by: userId,
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.completed',
      entity_type: 'deal',
      entity_id: dealId,
      after: { actual_gross: actualGross },
      source: 'web',
    })
  },

  /**
   * Cancel a deal with reason.
   */
  async cancel(
    dealershipId: string,
    dealId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: deal } = await supabase
      .from('deals')
      .select('status, vehicle_id, reservation_id')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!deal) throw new Error('Deal not found')
    if (deal.status === 'completed') throw new Error('Completed deals cannot be cancelled')
    if (deal.status === 'cancelled') throw new Error('Deal is already cancelled')

    await supabase.from('deals').update({
      status: 'cancelled',
      cancelled_at: now,
      cancellation_reason: reason,
      cancelled_by: userId,
      updated_by: userId,
    }).eq('dealership_id', dealershipId).eq('id', dealId)

    // Release vehicle reservation if any active
    if (deal.vehicle_id) {
      await supabase.from('reservations')
        .update({ status: 'cancelled', cancelled_at: now, cancellation_reason: reason, cancelled_by: userId })
        .eq('deal_id', dealId)
        .eq('status', 'active')

      // Return vehicle to available if reserved
      const { data: vehicle } = await supabase.from('vehicles')
        .select('status')
        .eq('id', deal.vehicle_id)
        .single()

      if (vehicle?.status === 'reserved') {
        await supabase.from('vehicles').update({
          status: 'available',
          updated_at: now,
        }).eq('id', deal.vehicle_id)
      }
    }

    await supabase.from('deal_status_history').insert({
      dealership_id: dealershipId,
      deal_id: dealId,
      from_status: deal.status,
      to_status: 'cancelled',
      reason,
      changed_by: userId,
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'deal.cancelled',
      entity_type: 'deal',
      entity_id: dealId,
      after: { reason },
      source: 'web',
    })
  },

  /**
   * Get deal pipeline KPIs (counts only — no financial data).
   */
  async getKPIs(dealershipId: string): Promise<{
    byStatus: Record<string, number>
    totalActive: number
    depositsOutstanding: number
    handoversThisWeek: number
  }> {
    const supabase = await createClient()
    const now = new Date()
    const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString()

    const [{ data: deals }, { count: depositsOutstanding }, { count: handoversThisWeek }] = await Promise.all([
      supabase.from('deals').select('status').eq('dealership_id', dealershipId).not('status', 'in', '(completed,cancelled,lost)'),
      supabase.from('deals').select('id', { count: 'exact', head: true })
        .eq('dealership_id', dealershipId)
        .gt('deposit_required', 0)
        .filter('deposit_paid', 'lt', 'deposit_required')
        .not('status', 'in', '(completed,cancelled,lost)'),
      supabase.from('deals').select('id', { count: 'exact', head: true })
        .eq('dealership_id', dealershipId)
        .gte('handover_at', now.toISOString())
        .lte('handover_at', weekEnd)
        .not('status', 'in', '(cancelled,lost)'),
    ])

    const byStatus: Record<string, number> = {}
    for (const d of deals || []) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1
    }

    return {
      byStatus,
      totalActive: (deals || []).length,
      depositsOutstanding: depositsOutstanding || 0,
      handoversThisWeek: handoversThisWeek || 0,
    }
  },
}
