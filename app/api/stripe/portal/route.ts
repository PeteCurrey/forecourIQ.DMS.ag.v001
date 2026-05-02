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
      .select('stripe_customer_id')
      .eq('id', profile.dealership_id)
      .single()

    if (!dealership?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: dealership.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Stripe Portal Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
