import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    if (!sig || !webhookSecret) return NextResponse.json({ error: 'Webhook secret/signature missing' }, { status: 400 })
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Need service role to bypass RLS in webhook
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Idempotency check: record in webhook_events
  try {
    const { error: eventRecordError } = await supabase.from('webhook_events').insert({
      provider: 'stripe',
      event_type: event.type,
      external_event_id: event.id,
      payload: event as any,
      status: 'pending',
    })

    if (eventRecordError && eventRecordError.code === '23505') {
      // Event already processed
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch {
    // Non-fatal if webhook_events table not ready or unique index triggered
  }

  try {
    switch (event.type) {
      // Deal deposit payment intent succeeded
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any
        const paymentIntentId = paymentIntent.id
        const chargeId = paymentIntent.latest_charge

        const { data: payment } = await supabase
          .from('payments')
          .update({
            status: 'verified',
            is_manually_recorded: false,
            stripe_charge_id: chargeId || null,
            received_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .select('id, deal_id, dealership_id, category, amount')
          .single()

        if (payment && payment.deal_id) {
          // Recalculate deposit total on the deal
          const { data: allDeposits } = await supabase
            .from('payments')
            .select('amount')
            .eq('deal_id', payment.deal_id)
            .in('category', ['reservation_deposit', 'sales_deposit'])
            .in('status', ['recorded', 'verified'])

          const totalPaid = (allDeposits || []).reduce((s, p) => s + Number(p.amount || 0), 0)

          await supabase.from('deals').update({
            deposit_paid: Math.round(totalPaid * 100) / 100,
            deposit_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', payment.deal_id)
        }
        break
      }

      // Deal deposit payment failed
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        break
      }

      // Checkout session completed
      case 'checkout.session.completed': {
        const session = event.data.object as any
        if (session.metadata?.deal_id && session.payment_intent) {
          const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
          await supabase
            .from('payments')
            .update({
              status: 'verified',
              is_manually_recorded: false,
              received_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', piId)

          // Recalculate deposit
          const { data: allDeposits } = await supabase
            .from('payments')
            .select('amount')
            .eq('deal_id', session.metadata.deal_id)
            .in('category', ['reservation_deposit', 'sales_deposit'])
            .in('status', ['recorded', 'verified'])

          const totalPaid = (allDeposits || []).reduce((s, p) => s + Number(p.amount || 0), 0)

          await supabase.from('deals').update({
            deposit_paid: Math.round(totalPaid * 100) / 100,
            deposit_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', session.metadata.deal_id)
        }
        break
      }

      // Dealership subscriptions
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string
        const status = subscription.status
        const priceId = subscription.items.data[0].price.id

        let tier = 'starter'
        if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) tier = 'professional'
        if (priceId === process.env.STRIPE_PRICE_ELITE) tier = 'elite'

        await supabase
          .from('dealerships')
          .update({
            subscription_status: status,
            subscription_tier: tier,
            stripe_subscription_id: subscription.id
          })
          .eq('stripe_customer_id', customerId)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        await supabase
          .from('dealerships')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: null
          })
          .eq('stripe_customer_id', customerId)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const customerId = invoice.customer as string

        await supabase
          .from('dealerships')
          .update({
            subscription_status: 'past_due'
          })
          .eq('stripe_customer_id', customerId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
