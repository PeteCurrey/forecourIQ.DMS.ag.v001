import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { WebsiteEventsService } from '@/lib/services/website/website-events'

export async function POST(req: NextRequest) {
  try {
    const { reservation_id, session_id } = await req.json()

    if (!reservation_id || !session_id) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Payment system unavailable.' }, { status: 503 })
    }

    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ confirmed: false, message: 'Payment not yet confirmed.' })
    }

    if (session.metadata?.reservation_id !== reservation_id) {
      return NextResponse.json({ error: 'Reservation mismatch.' }, { status: 400 })
    }

    const supabase = await createClient()

    // Update reservation to active
    await supabase
      .from('reservations')
      .update({ status: 'active', notes: `Stripe Session: ${session_id}`, updated_at: new Date().toISOString() })
      .eq('id', reservation_id)
      .eq('status', 'pending_payment')

    // Mark vehicle as reserved
    const vehicleId = session.metadata?.vehicle_id
    if (vehicleId && session.metadata?.dealership_id) {
      await supabase.from('vehicles').update({ status: 'reserved' }).eq('id', vehicleId)

      WebsiteEventsService.track({
        dealership_id: session.metadata.dealership_id,
        vehicle_id: vehicleId,
        event_type: 'reservation_completed',
        metadata: { reservation_id, stripe_session: session_id },
      }).catch(() => {})
    }

    return NextResponse.json({
      confirmed: true,
      message: 'Your reservation is confirmed. We will contact you shortly to arrange the next steps.',
    })
  } catch (err: any) {
    console.error('[public/reservation/confirm]', err)
    return NextResponse.json({ error: 'Unable to confirm reservation.' }, { status: 500 })
  }
}
