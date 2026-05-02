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

  try {
    switch (event.type) {
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
