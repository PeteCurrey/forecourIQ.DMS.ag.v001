import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import { DealService } from '@/lib/services/deal'
import {
  calcAgreedPrice,
  calcCustomerPurchaseTotal,
  calcPXEquity,
  calcBalanceToFund,
  DealRecord,
} from '@/lib/services/deal-calc'

export interface DealDocumentRecord {
  id: string
  dealership_id: string
  deal_id: string
  document_type: string
  filename: string
  storage_path: string
  file_size?: number | null
  mime_type: string
  template_type?: string | null
  template_version?: string | null
  checksum?: string | null
  is_customer_facing: boolean
  notes?: string | null
  generated_by?: string | null
  uploaded_by?: string | null
  created_at: string
}

export interface DealInvoiceRecord {
  id: string
  dealership_id: string
  deal_id: string
  invoice_number: string
  customer_id?: string | null
  issued_at: string
  line_items: Array<{ description: string; amount: number; vat_rate?: number }>
  subtotal: number
  tax_treatment: Record<string, unknown>
  total: number
  payment_status: 'unpaid' | 'partial' | 'paid' | 'voided'
  notes?: string | null
  generated_by?: string | null
  created_at: string
}

export const DocumentService = {
  async listByDeal(dealershipId: string, dealId: string): Promise<DealDocumentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('deal_documents')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`DocumentService.listByDeal: ${error.message}`)
    return (data || []) as DealDocumentRecord[]
  },

  /**
   * Generate an official Vehicle Order Form document record and structured template.
   */
  async generateOrderForm(
    dealershipId: string,
    dealId: string,
    userId: string
  ): Promise<{ document: DealDocumentRecord; html: string }> {
    const supabase = await createClient()
    const deal = await DealService.getById(dealershipId, dealId)
    if (!deal) throw new Error('Deal not found')

    const { data: dealership } = await supabase
      .from('dealerships')
      .select('name, address_line1, address_line2, city, postcode, phone, email, vat_number, fca_number')
      .eq('id', dealershipId)
      .single()

    const agreedPrice = calcAgreedPrice(deal.vehicle_retail_price, deal.discount_amount)
    const lineItems = (deal.line_items || []).map((item) => ({
      category: item.category,
      description: item.description,
      customer_price: Number(item.customer_price),
      dealer_cost: Number(item.dealer_cost),
      quantity: Number(item.quantity || 1),
    }))
    const purchaseTotal = calcCustomerPurchaseTotal(agreedPrice, lineItems)
    const pxTotal = Number(deal.part_exchange_total || 0)
    const pxSettlement = Number(deal.part_exchange_settlement || 0)
    const pxEquity = calcPXEquity(pxTotal, pxSettlement)
    const depositPaid = Number(deal.deposit_paid || 0)
    const balanceToFund = calcBalanceToFund(purchaseTotal, pxEquity, depositPaid)

    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const ref = deal.deal_reference || `FIQ-${deal.id.slice(0, 8).toUpperCase()}`

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Vehicle Order Form — ${ref}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px; margin: 0; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0; }
    .ref { font-family: monospace; font-size: 14px; color: #555; }
    .dealer-info { text-align: right; font-size: 12px; line-height: 1.4; color: #333; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #eee; font-size: 13px; }
    .row.bold { font-weight: 700; border-bottom: 1px solid #000; font-size: 14px; }
    .label { color: #555; }
    .val { font-weight: 600; }
    .signatures { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-line { border-top: 1px solid #000; padding-top: 8px; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Vehicle Order Form</h1>
      <div class="ref">Ref: ${ref} · Date: ${dateStr}</div>
    </div>
    <div class="dealer-info">
      <strong>${dealership?.name || 'Dealership'}</strong><br/>
      ${dealership?.address_line1 ? `${dealership.address_line1}<br/>` : ''}
      ${dealership?.city ? `${dealership.city}, ` : ''}${dealership?.postcode || ''}<br/>
      Tel: ${dealership?.phone || '—'} · Email: ${dealership?.email || '—'}<br/>
      ${dealership?.vat_number ? `VAT: ${dealership.vat_number} · ` : ''}${dealership?.fca_number ? `FCA: ${dealership.fca_number}` : ''}
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-title">Customer Details</div>
      <div class="row"><span class="label">Full Name</span><span class="val">${deal.customers ? `${deal.customers.first_name} ${deal.customers.last_name}` : 'Not Specified'}</span></div>
      <div class="row"><span class="label">Phone</span><span class="val">${deal.customers?.phone || '—'}</span></div>
      <div class="row"><span class="label">Email</span><span class="val">${deal.customers?.email || '—'}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Vehicle Ordered</div>
      <div class="row"><span class="label">Registration</span><span class="val">${deal.vehicles?.registration || '—'}</span></div>
      <div class="row"><span class="label">Make & Model</span><span class="val">${deal.vehicles ? `${deal.vehicles.make} ${deal.vehicles.model} ${deal.vehicles.variant || ''}` : '—'}</span></div>
      <div class="row"><span class="label">Year / Mileage</span><span class="val">${deal.vehicles?.year || '—'} / ${deal.vehicles?.mileage ? deal.vehicles.mileage.toLocaleString() + ' mi' : '—'}</span></div>
      <div class="row"><span class="label">Colour</span><span class="val">${deal.vehicles?.colour || '—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Financial Summary</div>
    <div class="row"><span class="label">Vehicle Retail Price</span><span class="val">£${Number(deal.vehicle_retail_price || 0).toFixed(2)}</span></div>
    ${deal.discount_amount > 0 ? `<div class="row"><span class="label">Agreed Discount</span><span class="val">-£${Number(deal.discount_amount).toFixed(2)}</span></div>` : ''}
    <div class="row"><span class="label">Agreed Vehicle Price</span><span class="val">£${agreedPrice.toFixed(2)}</span></div>
    ${lineItems.map(item => `<div class="row"><span class="label">Product: ${item.description} (x${item.quantity})</span><span class="val">£${(item.customer_price * item.quantity).toFixed(2)}</span></div>`).join('')}
    <div class="row bold"><span class="label">Customer Purchase Total</span><span class="val">£${purchaseTotal.toFixed(2)}</span></div>
    ${pxTotal > 0 ? `
    <div class="row"><span class="label">Part Exchange Allowance</span><span class="val">£${pxTotal.toFixed(2)}</span></div>
    ${pxSettlement > 0 ? `<div class="row"><span class="label">Less Settlement to Finance</span><span class="val">-£${pxSettlement.toFixed(2)}</span></div>` : ''}
    <div class="row"><span class="label">Part Exchange Equity</span><span class="val">£${pxEquity.toFixed(2)}</span></div>
    ` : ''}
    <div class="row"><span class="label">Deposit Paid / Received</span><span class="val">£${depositPaid.toFixed(2)}</span></div>
    <div class="row bold"><span class="label">Balance Due on Handover / Finance</span><span class="val">£${balanceToFund.toFixed(2)}</span></div>
  </div>

  <div class="signatures">
    <div>
      <div class="sig-line">Customer Signature & Date</div>
    </div>
    <div>
      <div class="sig-line">Authorised Dealership Representative</div>
    </div>
  </div>
</body>
</html>
    `.trim()

    const filename = `order_form_${ref.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.html`
    const storagePath = `deals/${dealId}/documents/${filename}`

    const { data: doc, error: docErr } = await supabase
      .from('deal_documents')
      .insert({
        dealership_id: dealershipId,
        deal_id: dealId,
        document_type: 'order_form',
        filename,
        storage_path: storagePath,
        mime_type: 'text/html',
        template_type: 'canonical_v2_order_form',
        template_version: '2.0.0',
        is_customer_facing: true,
        generated_by: userId,
        notes: `Generated order form for ${ref}`,
      })
      .select('*')
      .single()

    if (docErr) throw new Error(`DocumentService.generateOrderForm: ${docErr.message}`)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'document.generated',
      entity_type: 'deal_document',
      entity_id: doc.id,
      after: { document_type: 'order_form', deal_id: dealId, filename },
      source: 'web',
    })

    return { document: doc as DealDocumentRecord, html }
  },

  /**
   * Generate an official Deposit Receipt document.
   */
  async generateDepositReceipt(
    dealershipId: string,
    paymentId: string,
    userId: string
  ): Promise<{ document: DealDocumentRecord; html: string }> {
    const supabase = await createClient()

    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*, deals(*, customers(*), vehicles(*))')
      .eq('dealership_id', dealershipId)
      .eq('id', paymentId)
      .single()

    if (pErr || !payment) throw new Error('Payment not found')

    const { data: dealership } = await supabase
      .from('dealerships')
      .select('name, address_line1, city, postcode, phone, email')
      .eq('id', dealershipId)
      .single()

    const deal = payment.deals as unknown as DealRecord | null
    const dealRef = deal?.deal_reference || `FIQ-${deal?.id?.slice(0, 8) || 'DEP'}`
    const dateStr = new Date(payment.received_at || payment.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Deposit Receipt — ${dealRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px; margin: 0; background: #fff; }
    .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #eee; font-size: 13px; }
    .row.total { font-size: 16px; font-weight: 700; border-top: 2px solid #000; border-bottom: 2px solid #000; margin-top: 16px; }
    .label { color: #555; }
    .val { font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">Deposit Receipt</h1>
    <div>Deal Ref: <strong>${dealRef}</strong> · Date: <strong>${dateStr}</strong></div>
    <div>${dealership?.name || 'ForecourtIQ Dealership'}</div>
  </div>

  <div class="row"><span class="label">Customer</span><span class="val">${deal?.customers ? `${deal.customers.first_name} ${deal.customers.last_name}` : 'Customer'}</span></div>
  <div class="row"><span class="label">Vehicle</span><span class="val">${deal?.vehicles ? `${deal.vehicles.registration} — ${deal.vehicles.make} ${deal.vehicles.model}` : 'Vehicle'}</span></div>
  <div class="row"><span class="label">Payment Category</span><span class="val">${payment.category.replace('_', ' ').toUpperCase()}</span></div>
  <div class="row"><span class="label">Payment Method</span><span class="val">${payment.method.toUpperCase()}</span></div>
  <div class="row"><span class="label">Provider / Ref</span><span class="val">${payment.provider.toUpperCase()} (${payment.provider_reference || payment.stripe_payment_intent_id || 'Internal'})</span></div>
  <div class="row"><span class="label">Recorded Status</span><span class="val">${payment.status.toUpperCase()}</span></div>
  <div class="row total"><span class="label">Amount Received</span><span class="val">£${Number(payment.amount).toFixed(2)} GBP</span></div>
</body>
</html>
    `.trim()

    const filename = `receipt_${paymentId.slice(0, 8)}.html`
    const storagePath = `deals/${payment.deal_id || 'general'}/receipts/${filename}`

    const { data: doc, error: docErr } = await supabase
      .from('deal_documents')
      .insert({
        dealership_id: dealershipId,
        deal_id: payment.deal_id || paymentId,
        document_type: 'deposit_receipt',
        filename,
        storage_path: storagePath,
        mime_type: 'text/html',
        template_type: 'canonical_v2_receipt',
        template_version: '2.0.0',
        is_customer_facing: true,
        generated_by: userId,
        notes: `Deposit receipt for payment ${paymentId}`,
      })
      .select('*')
      .single()

    if (docErr) throw new Error(`DocumentService.generateDepositReceipt: ${docErr.message}`)

    // Update payment receipt generated timestamp
    await supabase.from('payments').update({ receipt_generated_at: new Date().toISOString() }).eq('id', paymentId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'document.generated',
      entity_type: 'deal_document',
      entity_id: doc.id,
      after: { document_type: 'deposit_receipt', payment_id: paymentId },
      source: 'web',
    })

    return { document: doc as DealDocumentRecord, html }
  },
}
