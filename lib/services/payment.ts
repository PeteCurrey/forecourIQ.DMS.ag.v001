import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'

export interface PaymentRecord {
  id: string
  dealership_id: string
  deal_id?: string | null
  customer_id?: string | null
  category: 'reservation_deposit' | 'sales_deposit' | 'balance_payment' | 'refund' | 'other'
  amount: number
  currency: string
  method: 'card' | 'bank_transfer' | 'cash' | 'finance' | 'other'
  status: 'pending' | 'recorded' | 'verified' | 'failed' | 'refunded' | 'partially_refunded'
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

export interface RecordPaymentPayload {
  category: PaymentRecord['category']
  amount: number
  method: PaymentRecord['method']
  received_at?: string
  provider_reference?: string
  notes?: string
}

export const PaymentService = {
  async listByDeal(dealershipId: string, dealId: string): Promise<PaymentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`PaymentService.listByDeal: ${error.message}`)
    return (data || []) as PaymentRecord[]
  },

  /**
   * Manually record a payment.
   * Clearly marked as is_manually_recorded = true.
   * These are NOT provider-verified.
   */
  async record(
    dealershipId: string,
    dealId: string,
    userId: string,
    payload: RecordPaymentPayload
  ): Promise<PaymentRecord> {
    const supabase = await createClient()

    if (Number(payload.amount) <= 0) throw new Error('Payment amount must be greater than zero')

    const { data: deal } = await supabase
      .from('deals')
      .select('customer_id, status')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!deal) throw new Error('Deal not found')
    if (deal.status === 'completed') throw new Error('Cannot add payments to a completed deal')

    const { data, error } = await supabase
      .from('payments')
      .insert({
        dealership_id: dealershipId,
        deal_id: dealId,
        customer_id: deal.customer_id || null,
        category: payload.category,
        amount: Number(payload.amount),
        currency: 'GBP',
        method: payload.method,
        status: 'recorded',
        is_manually_recorded: true,
        provider: 'manual',
        provider_reference: payload.provider_reference || null,
        received_at: payload.received_at || new Date().toISOString(),
        notes: payload.notes || null,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(`PaymentService.record: ${error.message}`)

    // If this is a deposit, update deal.deposit_paid
    if (['reservation_deposit', 'sales_deposit'].includes(payload.category)) {
      await PaymentService._recalcDealDepositTotal(dealershipId, dealId)
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'payment.created',
      entity_type: 'payment',
      entity_id: data.id,
      after: { amount: payload.amount, method: payload.method, category: payload.category, is_manually_recorded: true },
      source: 'web',
    })

    return data as PaymentRecord
  },

  /**
   * Mark a Stripe payment as verified from webhook.
   * Uses stripe_payment_intent_id for idempotency.
   */
  async verifyStripePayment(
    dealershipId: string,
    paymentIntentId: string,
    chargeId?: string
  ): Promise<void> {
    const supabase = await createClient()

    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'verified',
        is_manually_recorded: false,
        stripe_charge_id: chargeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('status', 'pending')
      .select('id, deal_id, category, dealership_id')
      .single()

    if (error || !payment) {
      console.warn(`[PaymentService] Could not verify payment intent ${paymentIntentId}: ${error?.message}`)
      return
    }

    // Recalculate deposit total if applicable
    if (payment.deal_id && ['reservation_deposit', 'sales_deposit'].includes(payment.category)) {
      await PaymentService._recalcDealDepositTotal(payment.dealership_id, payment.deal_id)
    }

    await AuditService.log({
      dealership_id: payment.dealership_id,
      action: 'payment.verified',
      entity_type: 'payment',
      entity_id: payment.id,
      after: { stripe_payment_intent_id: paymentIntentId },
      source: 'webhook',
    })
  },

  /**
   * Create a Stripe Checkout session for a deal deposit.
   * The deposit is NOT confirmed until the webhook fires.
   */
  async createStripeDepositCheckout(
    dealershipId: string,
    dealId: string,
    userId: string,
    amount: number,
    category: 'reservation_deposit' | 'sales_deposit' = 'sales_deposit'
  ): Promise<{ url: string; paymentIntentId: string }> {
    // Dynamic import to keep Stripe server-only
    const { stripe } = await import('@/lib/stripe/server')
    const supabase = await createClient()

    if (amount <= 0) throw new Error('Deposit amount must be greater than zero')

    const { data: deal } = await supabase
      .from('deals')
      .select('deal_reference, customer_id, customers(email, first_name, last_name)')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (!deal) throw new Error('Deal not found')

    const customer = deal.customers as { email?: string; first_name?: string; last_name?: string } | null

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(amount * 100), // pence
          product_data: {
            name: category === 'reservation_deposit' ? 'Reservation Deposit' : 'Sales Deposit',
            description: `ForecourIQ Deal ${deal.deal_reference || dealId}`,
          },
        },
        quantity: 1,
      }],
      customer_email: customer?.email || undefined,
      metadata: {
        deal_id: dealId,
        dealership_id: dealershipId,
        category,
        created_by: userId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/deals/${dealId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/deals/${dealId}?payment=cancelled`,
    })

    if (!session.url || !session.payment_intent) throw new Error('Stripe session creation failed')

    const piId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent.id

    // Create payment record in pending state
    await supabase.from('payments').insert({
      dealership_id: dealershipId,
      deal_id: dealId,
      customer_id: deal.customer_id || null,
      category,
      amount,
      currency: 'GBP',
      method: 'card',
      status: 'pending',
      is_manually_recorded: false,
      provider: 'stripe',
      stripe_payment_intent_id: piId,
      stripe_checkout_session_id: session.id,
      notes: 'Stripe Checkout deposit — awaiting webhook confirmation',
      created_by: userId,
    })

    return { url: session.url, paymentIntentId: piId }
  },

  /**
   * Refund a payment.
   */
  async refund(
    dealershipId: string,
    paymentId: string,
    userId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const supabase = await createClient()

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('id', paymentId)
      .single()

    if (!payment) throw new Error('Payment not found')
    if (!['recorded', 'verified'].includes(payment.status)) throw new Error('Payment cannot be refunded')

    const refundAmount = Math.min(Number(amount), Number(payment.amount))

    // If Stripe payment, issue actual refund
    if (payment.provider === 'stripe' && payment.stripe_charge_id) {
      const { stripe } = await import('@/lib/stripe/server')
      await stripe.refunds.create({
        charge: payment.stripe_charge_id,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer',
      })
    }

    const newStatus = refundAmount >= Number(payment.amount) ? 'refunded' : 'partially_refunded'

    await supabase.from('payments').update({
      status: newStatus,
      refunded_at: new Date().toISOString(),
      refunded_amount: refundAmount,
      refund_reason: reason,
      refund_by: userId,
    }).eq('id', paymentId)

    // Recalculate deal deposit total
    if (payment.deal_id) {
      await PaymentService._recalcDealDepositTotal(dealershipId, payment.deal_id)
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'payment.refunded',
      entity_type: 'payment',
      entity_id: paymentId,
      after: { refunded_amount: refundAmount, reason },
      source: 'web',
    })
  },

  /**
   * Internal: recalculate and update deal.deposit_paid from verified/recorded payments.
   */
  async _recalcDealDepositTotal(dealershipId: string, dealId: string): Promise<void> {
    const supabase = await createClient()

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('deal_id', dealId)
      .in('category', ['reservation_deposit', 'sales_deposit'])
      .in('status', ['recorded', 'verified'])

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)

    await supabase.from('deals').update({
      deposit_paid: Math.round(totalPaid * 100) / 100,
      updated_at: new Date().toISOString(),
    }).eq('dealership_id', dealershipId).eq('id', dealId)
  },
}
