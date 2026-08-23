/**
 * ForecourIQ DMS — Deal Calculation Engine
 *
 * Pure deterministic arithmetic for all deal financial calculations.
 * Safe to import in both Server and Client components (no Supabase imports).
 *
 * PRINCIPLE: All financial arithmetic is explicit. No floating-point surprises.
 * Monetary values are stored as numeric(12,2) and operated on as JS numbers
 * with explicit toFixed(2) rounding at each calculation boundary.
 *
 * AI must never populate APR, monthly_payment, or financial totals directly.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DealStatus =
  | 'draft'
  | 'proposal'
  | 'negotiation'
  | 'agreed'
  | 'awaiting_deposit'
  | 'reserved'
  | 'finance_pending'
  | 'documentation'
  | 'pre_handover'
  | 'handover_ready'
  | 'completed'
  | 'cancelled'
  | 'lost'

export type DealPaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'finance' | 'mixed' | 'other'
export type FinanceStatus =
  | 'not_required' | 'discussion' | 'quote_requested' | 'quote_received'
  | 'application_pending' | 'submitted' | 'approved' | 'declined'
  | 'documents_required' | 'activated' | 'cancelled'
export type SettlementStatus = 'unknown' | 'requested' | 'received' | 'confirmed' | 'paid' | 'not_applicable'
export type PaymentStatus = 'pending' | 'recorded' | 'verified' | 'failed' | 'refunded' | 'partially_refunded'
export type AppraisalRating = 'good' | 'attention' | 'poor' | 'unknown'

export interface AppraisalArea {
  rating: AppraisalRating
  notes?: string
}

export interface DealAppraisal {
  bodywork?: AppraisalArea
  wheels?: AppraisalArea
  tyres?: AppraisalArea
  interior?: AppraisalArea
  glass?: AppraisalArea
  mechanical?: AppraisalArea
  warning_lights?: AppraisalArea
}

export interface DealLineItem {
  id?: string
  category: 'warranty' | 'paint_protection' | 'service_plan' | 'accessory' | 'delivery' | 'other'
  description: string
  customer_price: number
  dealer_cost: number
  quantity: number
}

export interface PartExchangeRecord {
  id: string
  deal_id: string
  dealership_id: string
  registration: string
  vin?: string | null
  make?: string | null
  model?: string | null
  derivative?: string | null
  year?: number | null
  mileage?: number | null
  colour?: string | null
  fuel_type?: string | null
  transmission?: string | null
  condition: string
  service_history: string
  keys_count: number
  mot_status: string
  mot_expiry?: string | null
  warning_lights: boolean
  notes?: string | null
  appraisal: DealAppraisal
  photos: string[]
  customer_expectation?: number | null
  trade_value?: number | null
  retail_estimate?: number | null
  allowance: number
  valuation_by?: string | null
  valuation_at?: string | null
  valuation_provider?: string | null
  finance_outstanding: boolean
  finance_provider?: string | null
  settlement_amount: number
  settlement_reference?: string | null
  settlement_valid_until?: string | null
  settlement_status: SettlementStatus
  status: string
  acquired_vehicle_id?: string | null
  created_at: string
  updated_at: string
}

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

export interface PaymentRecord {
  id: string
  dealership_id: string
  deal_id?: string | null
  customer_id?: string | null
  category: 'reservation_deposit' | 'sales_deposit' | 'balance_payment' | 'refund' | 'other'
  amount: number
  currency: string
  method: 'card' | 'bank_transfer' | 'cash' | 'finance' | 'other'
  status: PaymentStatus
  is_manually_recorded: boolean
  provider: 'stripe' | 'manual' | 'other'
  provider_reference?: string | null
  stripe_payment_intent_id?: string | null
  stripe_charge_id?: string | null
  stripe_checkout_session_id?: string | null
  received_at?: string | null
  refunded_at?: string | null
  refunded_amount?: number | null
  refund_reason?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface DealRecord {
  id: string
  dealership_id: string
  deal_reference?: string | null
  deal_number?: number | null
  location_id?: string | null
  customer_id?: string | null
  vehicle_id?: string | null
  lead_id?: string | null
  salesperson_id?: string | null
  created_by?: string | null
  updated_by?: string | null
  status: DealStatus
  // Commercial
  vehicle_retail_price: number
  agreed_vehicle_price: number
  discount_amount: number
  discount_reason?: string | null
  discount_approved_by?: string | null
  discounted_at?: string | null
  products_total: number
  // Part exchange (denormalised totals)
  part_exchange_total: number
  part_exchange_settlement: number
  part_exchange_equity: number
  // Finance / Payment
  finance_amount: number
  cash_amount: number
  payment_method: DealPaymentMethod
  // Deposit
  deposit_required: number
  deposit_paid: number
  deposit_paid_at?: string | null
  // Margin
  gross_margin_projected?: number | null
  gross_margin_actual?: number | null
  // Timestamps
  deal_created_at?: string
  agreed_at?: string | null
  sold_at?: string | null
  handover_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations (joined)
  customers?: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
  } | null
  vehicles?: {
    id: string
    registration: string
    make: string
    model: string
    variant?: string | null
    year: number
    mileage: number
    colour?: string | null
    status: string
    asking_price: number
    purchase_price?: number
    auction_fee?: number
    transport_cost?: number
    prep_cost?: number
    other_acquisition_costs?: number
    photos?: string[] | null
  } | null
  leads?: {
    id: string
    source?: string | null
    channel?: string | null
    status?: string | null
  } | null
  salesperson?: {
    id: string
    full_name: string
    email?: string
  } | null
  part_exchanges?: PartExchangeRecord[]
  line_items?: DealLineItem[]
  finance_proposals?: {
    id: string
    status: FinanceStatus
    provider?: string | null
    product_type?: string | null
    amount_to_finance?: number | null
    monthly_payment?: number | null
    is_manually_recorded: boolean
  }[]
  payments?: {
    id: string
    category: string
    amount: number
    status: PaymentStatus
    method: string
    is_manually_recorded: boolean
    provider: string
    received_at?: string | null
  }[]
}

export interface DealKPIs {
  openDeals: number
  agreedToday: number
  depositsOutstanding: number
  financePending: number
  handoversToday: number
  completedThisMonth: number
  projectedGross: number
  actualGross: number
}

// ─── Calculation Functions ────────────────────────────────────────────────────

/** Round to 2 decimal places — prevents float accumulation errors */
const r2 = (n: number): number => Math.round(n * 100) / 100

/**
 * Core deal price calculation.
 * Retail Price − Discount = Agreed Vehicle Price
 */
export function calcAgreedPrice(retailPrice: number, discountAmount: number): number {
  return r2(Math.max(0, Number(retailPrice || 0) - Number(discountAmount || 0)))
}

/**
 * Customer purchase total.
 * Agreed Vehicle Price + Products/Accessories = Customer Purchase Total
 */
export function calcCustomerPurchaseTotal(agreedPrice: number, lineItems: DealLineItem[]): number {
  const productsTotal = lineItems.reduce(
    (sum, item) => sum + r2(Number(item.customer_price || 0) * Number(item.quantity || 1)),
    0
  )
  return r2(Number(agreedPrice || 0) + productsTotal)
}

/**
 * Part exchange equity.
 * PX Allowance − Settlement Amount = Customer Equity
 * Negative values are returned as-is — callers must display them prominently.
 */
export function calcPXEquity(allowance: number, settlementAmount: number): number {
  return r2(Number(allowance || 0) - Number(settlementAmount || 0))
}

/** Determine if PX equity is negative (customer owes money) */
export function isNegativeEquity(equity: number): boolean {
  return equity < 0
}

/**
 * Balance the customer needs to fund/pay.
 * Purchase Total − PX Equity − Deposit Already Paid = Balance to Fund
 */
export function calcBalanceToFund(
  purchaseTotal: number,
  pxEquity: number,
  depositPaid: number
): number {
  return r2(Math.max(0, Number(purchaseTotal || 0) - Number(pxEquity || 0) - Number(depositPaid || 0)))
}

/**
 * Projected gross margin (before sale completes).
 * Agreed Selling Price − Total Vehicle Invested Cost = Projected Vehicle Gross
 */
export function calcProjectedGross(
  agreedSellingPrice: number,
  investedCost: number
): number {
  return r2(Number(agreedSellingPrice || 0) - Number(investedCost || 0))
}

/**
 * Actual gross margin (set only at deal completion).
 * Actual Selling Price − Final Invested Vehicle Cost = Actual Vehicle Gross
 */
export function calcActualGross(
  actualSellingPrice: number,
  investedCost: number
): number {
  return r2(Number(actualSellingPrice || 0) - Number(investedCost || 0))
}

/**
 * Total vehicle invested cost from vehicle record fields.
 * Mirrors vehicle-calc.ts logic for use in deal context.
 */
export function calcVehicleInvestedCost(vehicle: {
  purchase_price?: number | null
  auction_fee?: number | null
  transport_cost?: number | null
  prep_cost?: number | null
  other_acquisition_costs?: number | null
}): number {
  return r2(
    Number(vehicle.purchase_price || 0) +
    Number(vehicle.auction_fee || 0) +
    Number(vehicle.transport_cost || 0) +
    Number(vehicle.prep_cost || 0) +
    Number(vehicle.other_acquisition_costs || 0)
  )
}

/** Products/line items gross (dealer margin on accessories etc.) */
export function calcProductsGross(lineItems: DealLineItem[]): number {
  return r2(
    lineItems.reduce(
      (sum, item) =>
        sum + r2((Number(item.customer_price || 0) - Number(item.dealer_cost || 0)) * Number(item.quantity || 1)),
      0
    )
  )
}

// ─── Deal Checklist ───────────────────────────────────────────────────────────

export type ChecklistItemStatus = 'complete' | 'pending' | 'blocked' | 'not_applicable'

export interface ChecklistItem {
  key: string
  label: string
  status: ChecklistItemStatus
  severity: 'blocker' | 'warning' | 'info'
  detail?: string
}

/**
 * Derive a deterministic deal checklist from deal state.
 * BLOCKER items prevent safe deal progression.
 * WARNING items require attention but don't block.
 */
export function assessDealChecklist(deal: DealRecord): ChecklistItem[] {
  const items: ChecklistItem[] = []

  // Customer
  items.push({
    key: 'customer',
    label: 'Customer details complete',
    status: deal.customer_id ? 'complete' : 'blocked',
    severity: 'blocker',
    detail: deal.customer_id ? undefined : 'No customer linked to this deal',
  })

  // Vehicle
  items.push({
    key: 'vehicle',
    label: 'Vehicle confirmed',
    status: deal.vehicle_id ? 'complete' : 'blocked',
    severity: 'blocker',
    detail: deal.vehicle_id ? undefined : 'No vehicle linked to this deal',
  })

  // Agreed price
  const hasAgreedPrice = Number(deal.agreed_vehicle_price || 0) > 0
  items.push({
    key: 'agreed_price',
    label: 'Selling price agreed',
    status: hasAgreedPrice ? 'complete' : 'blocked',
    severity: 'blocker',
    detail: hasAgreedPrice ? undefined : 'Agreed vehicle price must be set',
  })

  // Deposit
  const depositRequired = Number(deal.deposit_required || 0) > 0
  const depositPaid = Number(deal.deposit_paid || 0)
  if (depositRequired) {
    const depositOk = depositPaid >= Number(deal.deposit_required)
    items.push({
      key: 'deposit',
      label: 'Deposit received',
      status: depositOk ? 'complete' : 'pending',
      severity: 'warning',
      detail: depositOk ? undefined : `£${(Number(deal.deposit_required) - depositPaid).toFixed(2)} outstanding`,
    })
  } else {
    items.push({ key: 'deposit', label: 'Deposit', status: 'not_applicable', severity: 'info' })
  }

  // Finance
  const financeProposal = deal.finance_proposals?.[0]
  if (deal.payment_method === 'finance' || deal.payment_method === 'mixed') {
    const financeOk = financeProposal?.status === 'approved' || financeProposal?.status === 'activated'
    items.push({
      key: 'finance',
      label: 'Finance arranged',
      status: financeOk ? 'complete' : 'pending',
      severity: 'warning',
      detail: financeProposal ? `Status: ${financeProposal.status}` : 'No finance proposal recorded',
    })
  } else {
    items.push({ key: 'finance', label: 'Finance', status: 'not_applicable', severity: 'info' })
  }

  // PX settlement
  const pxRecords = deal.part_exchanges || []
  const pxWithFinance = pxRecords.filter(px => px.finance_outstanding)
  if (pxWithFinance.length > 0) {
    const allSettled = pxWithFinance.every(
      px => px.settlement_status === 'confirmed' || px.settlement_status === 'paid'
    )
    items.push({
      key: 'px_settlement',
      label: 'Part exchange settlement confirmed',
      status: allSettled ? 'complete' : 'pending',
      severity: 'warning',
      detail: allSettled ? undefined : 'Outstanding finance settlement not yet confirmed',
    })
  }

  // Handover date
  items.push({
    key: 'handover_date',
    label: 'Handover date agreed',
    status: deal.handover_at ? 'complete' : 'pending',
    severity: 'warning',
    detail: deal.handover_at ? undefined : 'No handover date scheduled',
  })

  return items
}

// ─── Risk Signals ─────────────────────────────────────────────────────────────

export interface DealRiskSignal {
  key: string
  label: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  detail?: string
}

/**
 * Deterministic risk signal assessment.
 * No AI involvement — purely derived from deal data.
 */
export function assessDealRisks(deal: DealRecord, nowMs = Date.now()): DealRiskSignal[] {
  const signals: DealRiskSignal[] = []
  const now = new Date(nowMs)

  // Deposit outstanding
  const depositRequired = Number(deal.deposit_required || 0)
  const depositPaid = Number(deal.deposit_paid || 0)
  if (depositRequired > 0 && depositPaid < depositRequired) {
    signals.push({
      key: 'deposit_outstanding',
      label: 'Deposit outstanding',
      severity: deal.status === 'agreed' || deal.status === 'awaiting_deposit' ? 'high' : 'medium',
      detail: `£${(depositRequired - depositPaid).toFixed(2)} not yet received`,
    })
  }

  // Finance pending for agreed deal
  if (
    (deal.payment_method === 'finance' || deal.payment_method === 'mixed') &&
    deal.status !== 'completed' && deal.status !== 'cancelled'
  ) {
    const fp = deal.finance_proposals?.[0]
    if (!fp || ['discussion','quote_requested','application_pending','submitted'].includes(fp.status)) {
      signals.push({
        key: 'finance_pending',
        label: 'Finance not yet approved',
        severity: deal.status === 'finance_pending' ? 'high' : 'medium',
        detail: fp ? `Status: ${fp.status}` : 'No finance proposal recorded',
      })
    }
  }

  // PX settlement missing when finance outstanding
  const pxWithFinance = (deal.part_exchanges || []).filter(px => px.finance_outstanding)
  const unsettledPX = pxWithFinance.filter(
    px => !['confirmed','paid'].includes(px.settlement_status)
  )
  if (unsettledPX.length > 0) {
    signals.push({
      key: 'px_settlement_missing',
      label: 'Part exchange settlement not confirmed',
      severity: 'high',
      detail: `${unsettledPX.length} PX with outstanding finance`,
    })
  }

  // Handover imminent with incomplete deal
  if (deal.handover_at) {
    const handoverMs = new Date(deal.handover_at).getTime()
    const hoursUntil = (handoverMs - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntil <= 24 && hoursUntil > 0 && deal.status !== 'completed') {
      const blockers = assessDealChecklist(deal).filter(
        item => item.severity === 'blocker' && item.status !== 'complete'
      )
      if (blockers.length > 0) {
        signals.push({
          key: 'handover_tomorrow_incomplete',
          label: 'Handover tomorrow — deal incomplete',
          severity: 'critical',
          detail: `${blockers.length} blocker(s) outstanding`,
        })
      }
    }
  }

  // No activity for 3+ days (active deals only)
  if (!['completed','cancelled','lost'].includes(deal.status)) {
    const lastUpdated = new Date(deal.updated_at).getTime()
    const daysSinceUpdate = (now.getTime() - lastUpdated) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate >= 3) {
      signals.push({
        key: 'no_activity',
        label: `No activity for ${Math.floor(daysSinceUpdate)} days`,
        severity: daysSinceUpdate >= 7 ? 'high' : 'medium',
      })
    }
  }

  // Negative equity not acknowledged
  const pxEquity = Number(deal.part_exchange_equity || 0)
  if (pxEquity < 0) {
    signals.push({
      key: 'negative_equity',
      label: 'Negative equity on part exchange',
      severity: 'high',
      detail: `Customer owes £${Math.abs(pxEquity).toFixed(2)} more than PX allowance`,
    })
  }

  return signals.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.severity] - order[b.severity]
  })
}

// ─── KPI Calculation ──────────────────────────────────────────────────────────

/** Calculate deal pipeline KPIs from a list of deal records. */
export function calcDealKPIs(deals: DealRecord[], nowMs = Date.now()): DealKPIs {
  const now = new Date(nowMs)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const openStatuses: DealStatus[] = [
    'draft','proposal','negotiation','agreed','awaiting_deposit',
    'reserved','finance_pending','documentation','pre_handover','handover_ready',
  ]

  const openDeals = deals.filter(d => openStatuses.includes(d.status)).length

  const agreedToday = deals.filter(d => {
    if (!d.agreed_at) return false
    return new Date(d.agreed_at) >= todayStart
  }).length

  const depositsOutstanding = deals.filter(d => {
    if (['completed','cancelled','lost'].includes(d.status)) return false
    return Number(d.deposit_required || 0) > Number(d.deposit_paid || 0)
  }).length

  const financePending = deals.filter(d => {
    if (['completed','cancelled','lost'].includes(d.status)) return false
    return d.payment_method === 'finance' || d.payment_method === 'mixed'
  }).filter(d => {
    const fp = d.finance_proposals?.[0]
    return !fp || !['approved','activated','not_required'].includes(fp.status)
  }).length

  const handoversToday = deals.filter(d => {
    if (!d.handover_at) return false
    const ho = new Date(d.handover_at)
    return ho >= todayStart && ho < new Date(todayStart.getTime() + 86400000)
  }).length

  const completedThisMonth = deals.filter(d => {
    if (d.status !== 'completed' || !d.completed_at) return false
    return new Date(d.completed_at) >= monthStart
  }).length

  const projectedGross = deals
    .filter(d => openStatuses.includes(d.status))
    .reduce((sum, d) => sum + Number(d.gross_margin_projected || 0), 0)

  const actualGross = deals
    .filter(d => d.status === 'completed' && d.completed_at && new Date(d.completed_at) >= monthStart)
    .reduce((sum, d) => sum + Number(d.gross_margin_actual || 0), 0)

  return {
    openDeals,
    agreedToday,
    depositsOutstanding,
    financePending,
    handoversToday,
    completedThisMonth,
    projectedGross: Math.round(projectedGross * 100) / 100,
    actualGross: Math.round(actualGross * 100) / 100,
  }
}

// ─── Deal Age ─────────────────────────────────────────────────────────────────

export function getDealAge(deal: DealRecord, nowMs = Date.now()): { totalDays: number; stageDays: number } {
  const created = new Date(deal.deal_created_at || deal.created_at).getTime()
  const updated = new Date(deal.updated_at).getTime()
  const totalDays = Math.floor((nowMs - created) / 86400000)
  const stageDays = Math.floor((nowMs - updated) / 86400000)
  return { totalDays, stageDays }
}

// ─── Handover Checklist Template ─────────────────────────────────────────────

export function defaultHandoverChecklist(): { key: string; label: string; status: string }[] {
  return [
    { key: 'identity_confirmed', label: 'Customer identity confirmed', status: 'pending' },
    { key: 'payment_confirmed', label: 'Payment confirmed', status: 'pending' },
    { key: 'px_received', label: 'Part exchange received', status: 'pending' },
    { key: 'px_keys_received', label: 'Part exchange keys received', status: 'pending' },
    { key: 'vehicle_keys_handed_over', label: 'Vehicle keys handed over', status: 'pending' },
    { key: 'documents_handed_over', label: 'Documents handed over', status: 'pending' },
    { key: 'vehicle_walkthrough_completed', label: 'Vehicle walkthrough completed', status: 'pending' },
    { key: 'customer_questions_answered', label: 'Customer questions answered', status: 'pending' },
    { key: 'handover_acknowledgement', label: 'Handover acknowledgement obtained', status: 'pending' },
  ]
}
