import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcAgreedPrice,
  calcCustomerPurchaseTotal,
  calcPXEquity,
  isNegativeEquity,
  calcBalanceToFund,
  calcProjectedGross,
  calcActualGross,
  calcVehicleInvestedCost,
  calcProductsGross,
  assessDealChecklist,
  assessDealRisks,
  calcDealKPIs,
  getDealAge,
  defaultHandoverChecklist,
  DealRecord,
  DealLineItem,
} from '../deal-calc'

test('Deal Calculation Engine: Agreed price arithmetic', () => {
  // Retail £24,995 - Discount £500 = £24,495
  assert.equal(calcAgreedPrice(24995, 500), 24495)
  // Zero discount
  assert.equal(calcAgreedPrice(15000, 0), 15000)
  // Discount exceeding retail clamps to 0
  assert.equal(calcAgreedPrice(5000, 6000), 0)
})

test('Deal Calculation Engine: Customer purchase total with products/accessories', () => {
  const agreedPrice = 20000
  const lineItems: DealLineItem[] = [
    { category: 'warranty', description: '24m Warranty', customer_price: 599, dealer_cost: 250, quantity: 1 },
    { category: 'paint_protection', description: 'Ceramic Coating', customer_price: 350, dealer_cost: 100, quantity: 1 },
    { category: 'accessory', description: 'Rubber Floor Mats', customer_price: 50, dealer_cost: 25, quantity: 2 },
  ]

  // £20,000 + £599 + £350 + (£50 * 2) = £21,049
  const total = calcCustomerPurchaseTotal(agreedPrice, lineItems)
  assert.equal(total, 21049)

  // Products gross profit: (599-250) + (350-100) + (100-50) = 349 + 250 + 50 = £649
  const productsGross = calcProductsGross(lineItems)
  assert.equal(productsGross, 649)
})

test('Deal Calculation Engine: Part Exchange equity and negative equity detection', () => {
  // Positive equity: Allowance £8,000, Settlement £5,500 -> Net Equity +£2,500
  const posEquity = calcPXEquity(8000, 5500)
  assert.equal(posEquity, 2500)
  assert.equal(isNegativeEquity(posEquity), false)

  // Negative equity: Allowance £6,000, Settlement £7,800 -> Net Equity -£1,800
  const negEquity = calcPXEquity(6000, 7800)
  assert.equal(negEquity, -1800)
  assert.equal(isNegativeEquity(negEquity), true)

  // Clear finance: Allowance £5,000, Settlement £0 -> Net Equity +£5,000
  const clearEquity = calcPXEquity(5000, 0)
  assert.equal(clearEquity, 5000)
})

test('Deal Calculation Engine: Balance to Fund calculation', () => {
  // Scenario 1: Positive equity
  // Purchase Total: £20,000, PX Equity: +£3,000, Deposit: £500 -> Balance: £16,500
  assert.equal(calcBalanceToFund(20000, 3000, 500), 16500)

  // Scenario 2: Negative equity (customer owes more on PX)
  // Purchase Total: £20,000, PX Equity: -£1,000, Deposit: £500 -> Balance: £20,500
  assert.equal(calcBalanceToFund(20000, -1000, 500), 20500)

  // Scenario 3: Fully paid / overpaid
  assert.equal(calcBalanceToFund(5000, 3000, 3000), 0)
})

test('Deal Calculation Engine: Invested cost and gross margin', () => {
  const vehicle = {
    purchase_price: 12000,
    auction_fee: 350,
    transport_cost: 150,
    prep_cost: 450,
    other_acquisition_costs: 50,
  }

  // Total invested = 12000 + 350 + 150 + 450 + 50 = £13,000
  const invested = calcVehicleInvestedCost(vehicle)
  assert.equal(invested, 13000)

  // Agreed selling price = £15,500 -> Projected Gross = £2,500
  assert.equal(calcProjectedGross(15500, invested), 2500)

  // Sold at £15,200 -> Actual Gross = £2,200
  assert.equal(calcActualGross(15200, invested), 2200)
})

test('Deal Checklist: Evaluates blockers and warnings accurately', () => {
  const incompleteDeal: DealRecord = {
    id: 'deal-1',
    dealership_id: 'd-1',
    status: 'draft',
    vehicle_retail_price: 15000,
    agreed_vehicle_price: 0, // Blocker: price not agreed
    discount_amount: 0,
    products_total: 0,
    part_exchange_total: 0,
    part_exchange_settlement: 0,
    part_exchange_equity: 0,
    finance_amount: 0,
    cash_amount: 0,
    payment_method: 'cash',
    deposit_required: 500,
    deposit_paid: 0, // Warning: deposit pending
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_id: undefined, // Blocker: no customer
    vehicle_id: 'veh-1',
  }

  const checklist = assessDealChecklist(incompleteDeal)
  const blockers = checklist.filter((i) => i.severity === 'blocker' && i.status === 'blocked')
  const warnings = checklist.filter((i) => i.severity === 'warning' && i.status === 'pending')

  // Expect 2 blockers (customer missing, agreed price is 0)
  assert.equal(blockers.length, 2)
  // Expect deposit warning
  assert.ok(warnings.some((w) => w.key === 'deposit'))
})

test('Deal Risks: Deterministic risk signals without AI simulation', () => {
  const riskyDeal: DealRecord = {
    id: 'deal-2',
    dealership_id: 'd-1',
    status: 'awaiting_deposit',
    vehicle_retail_price: 18000,
    agreed_vehicle_price: 18000,
    discount_amount: 0,
    products_total: 0,
    part_exchange_total: 5000,
    part_exchange_settlement: 6500,
    part_exchange_equity: -1500, // Negative equity
    finance_amount: 0,
    cash_amount: 0,
    payment_method: 'cash',
    deposit_required: 500,
    deposit_paid: 0, // Outstanding deposit
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days inactive
  }

  const signals = assessDealRisks(riskyDeal)
  assert.ok(signals.length >= 3)
  assert.ok(signals.some((s) => s.key === 'deposit_outstanding'))
  assert.ok(signals.some((s) => s.key === 'negative_equity'))
  assert.ok(signals.some((s) => s.key === 'no_activity'))
})

test('Deal KPIs: Pipeline aggregations', () => {
  const deals: DealRecord[] = [
    {
      id: 'd1',
      dealership_id: 'dl-1',
      status: 'agreed',
      vehicle_retail_price: 10000,
      agreed_vehicle_price: 10000,
      discount_amount: 0,
      products_total: 0,
      part_exchange_total: 0,
      part_exchange_settlement: 0,
      part_exchange_equity: 0,
      finance_amount: 0,
      cash_amount: 0,
      payment_method: 'cash',
      deposit_required: 500,
      deposit_paid: 500,
      gross_margin_projected: 1500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agreed_at: new Date().toISOString(),
    },
    {
      id: 'd2',
      dealership_id: 'dl-1',
      status: 'completed',
      vehicle_retail_price: 15000,
      agreed_vehicle_price: 15000,
      discount_amount: 0,
      products_total: 0,
      part_exchange_total: 0,
      part_exchange_settlement: 0,
      part_exchange_equity: 0,
      finance_amount: 0,
      cash_amount: 0,
      payment_method: 'cash',
      deposit_required: 500,
      deposit_paid: 500,
      gross_margin_actual: 2200,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const kpis = calcDealKPIs(deals)
  assert.equal(kpis.openDeals, 1)
  assert.equal(kpis.agreedToday, 1)
  assert.equal(kpis.completedThisMonth, 1)
  assert.equal(kpis.projectedGross, 1500)
  assert.equal(kpis.actualGross, 2200)
})

test('Handover Checklist: Contains all 9 canonical vehicle delivery checks', () => {
  const checklist = defaultHandoverChecklist()
  assert.equal(checklist.length, 9)
  assert.ok(checklist.some((c) => c.key === 'identity_confirmed'))
  assert.ok(checklist.some((c) => c.key === 'vehicle_keys_handed_over'))
  assert.ok(checklist.some((c) => c.key === 'documents_handed_over'))
})
