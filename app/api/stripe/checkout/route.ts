import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()

    // Map plan names to price IDs
    const priceId = 
      plan === 'starter' ? process.env.STRIPE_PRICE_STARTER :
      plan === 'elite' ? process.env.STRIPE_PRICE_ELITE :
      process.env.STRIPE_PRICE_PROFESSIONAL // Default to professional

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or missing Stripe price ID in environment' }, { status: 400 })
    }

    // Get dealership info
    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'No dealership found' }, { status: 400 })
    }

    const { data: dealership } = await supabase
      .from('dealerships')
      .select('*')
      .eq('id', profile.dealership_id)
      .single()

    let customerId = dealership?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: dealership?.name,
        metadata: {
          dealership_id: profile.dealership_id,
        },
      })
      customerId = customer.id
      
      // Save customer ID
      await supabase
        .from('dealerships')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.dealership_id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          dealership_id: profile.dealership_id,
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=4&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=3`,
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
