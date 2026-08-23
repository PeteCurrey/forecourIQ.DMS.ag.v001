import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { WebsiteEventsService } from '@/lib/services/website/website-events'
import type { PublicReservationPayload } from '@/lib/types/public-website'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PublicReservationPayload & { website?: string }

    if (body.website) return NextResponse.json({ success: true })

    const supabase = await createClient()

    // Resolve dealership
    const { data: dealership } = await supabase
      .from('dealerships')
      .select('id, name')
      .eq('slug', body.dealership_slug)
      .single()
    if (!dealership) return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })

    // Validate
    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 })
    }

    // Get website config
    const { data: website } = await supabase
      .from('dealer_websites')
      .select('online_reservations_enabled, reservation_deposit_amount, reservation_duration_hours')
      .eq('dealership_id', dealership.id)
      .single()

    if (!website?.online_reservations_enabled) {
      return NextResponse.json({ error: 'Online reservations are not available.' }, { status: 400 })
    }

    // Resolve vehicle
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, make, model, year, asking_price, status, website_slug')
      .eq('dealership_id', dealership.id)
      .eq('website_slug', body.vehicle_slug)
      .single()

    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
    if (!['available', 'advertised'].includes(vehicle.status)) {
      return NextResponse.json({ error: 'This vehicle is no longer available for reservation.' }, { status: 409 })
    }

    // Match or create customer
    let customerId: string
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('dealership_id', dealership.id)
      .eq('email', body.email.toLowerCase().trim())
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newC } = await supabase
        .from('customers')
        .insert({
          dealership_id: dealership.id,
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          email: body.email.toLowerCase().trim(),
          phone: body.phone.trim(),
          marketing_consent: body.marketing_consent,
        })
        .select('id')
        .single()
      customerId = newC!.id
    }

    // Create pending reservation record
    const depositAmount = Number(website.reservation_deposit_amount ?? 299)
    const expiresAt = new Date(Date.now() + (website.reservation_duration_hours ?? 72) * 3600000).toISOString()

    const { data: reservation } = await supabase
      .from('reservations')
      .insert({
        dealership_id: dealership.id,
        vehicle_id: vehicle.id,
        customer_id: customerId,
        status: 'pending_payment',
        deposit_amount: depositAmount,
        expires_at: expiresAt,
        notes: body.notes ?? null,
      })
      .select('id')
      .single()

    if (!reservation) throw new Error('Failed to create reservation')

    // Create Stripe Checkout
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Payment processing is not configured.' }, { status: 503 })
    }

    const stripe = new Stripe(stripeKey)
    const origin = req.headers.get('origin') ?? 'https://forecour-iq-dms-ag-v001.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(depositAmount * 100),
          product_data: {
            name: `Vehicle Reservation — ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            description: `Reservation deposit for ${dealership.name}. Refund policy per dealership terms.`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        reservation_id: reservation.id,
        vehicle_id: vehicle.id,
        dealership_id: dealership.id,
        customer_id: customerId,
        type: 'vehicle_reservation',
      },
      customer_email: body.email,
      success_url: `${origin}/used-cars/${body.vehicle_slug}/reserve/success?reservation_id=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/used-cars/${body.vehicle_slug}?reservation_cancelled=true`,
    })

    WebsiteEventsService.track({
      dealership_id: dealership.id,
      vehicle_id: vehicle.id,
      event_type: 'reservation_started',
      metadata: { vehicle_slug: body.vehicle_slug, deposit: depositAmount },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      reservation_id: reservation.id,
      message: 'Proceeding to secure payment.',
    })
  } catch (err: any) {
    console.error('[public/reservation]', err)
    return NextResponse.json(
      { error: 'Unable to start reservation. Please try again.' },
      { status: 500 }
    )
  }
}
