import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VehicleDataService } from '@/lib/services/integrations/vehicle-data'
import { WebsiteEventsService } from '@/lib/services/website/website-events'
import type { PublicPXPayload } from '@/lib/types/public-website'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PublicPXPayload & { website?: string }

    // Honeypot
    if (body.website) return NextResponse.json({ success: true, message: 'Received.' })

    const supabase = await createClient()
    const { data: dealership } = await supabase
      .from('dealerships')
      .select('id')
      .eq('slug', body.dealership_slug)
      .single()

    if (!dealership) return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })

    // Validate
    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim() || !body.registration?.trim()) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 })
    }

    // Attempt DVLA lookup if configured
    let hasLookupData = false
    let lookupData: Record<string, unknown> = {}
    try {
      const lookup = await VehicleDataService.lookupRegistration(dealership.id, body.registration)
      if (lookup.success && lookup.data) {
        hasLookupData = true
        lookupData = (lookup.data as unknown) as Record<string, unknown>
      }
    } catch {
      // lookup failure is non-fatal for PX submission
    }

    // Match or create customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('dealership_id', dealership.id)
      .eq('email', body.email.toLowerCase().trim())
      .maybeSingle()

    let customerId = existingCustomer?.id
    if (!customerId) {
      const { data: newCustomer, error: cErr } = await supabase
        .from('customers')
        .insert({
          dealership_id: dealership.id,
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          email: body.email.toLowerCase().trim(),
          phone: body.phone?.trim() ?? null,
          marketing_consent: body.marketing_consent,
          marketing_consent_at: body.marketing_consent ? new Date().toISOString() : null,
        })
        .select('id')
        .single()
      if (cErr) throw cErr
      customerId = newCustomer.id
    }

    // Resolve interested vehicle
    let interestedVehicleId: string | null = null
    if (body.interested_vehicle_slug) {
      const { data: v } = await supabase
        .from('vehicles')
        .select('id')
        .eq('dealership_id', dealership.id)
        .eq('website_slug', body.interested_vehicle_slug)
        .single()
      interestedVehicleId = v?.id ?? null
    }

    // Create lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        dealership_id: dealership.id,
        customer_id: customerId,
        vehicle_id: interestedVehicleId,
        source: 'dealer_website',
        channel: 'website',
        status: 'new',
        temperature: 'warm',
        priority: 'normal',
        title: `Online PX Enquiry — ${body.registration.toUpperCase()}`,
        notes: body.additional_notes ?? null,
        metadata: {
          provider_id: 'dealer_website',
          external_lead_id: `px_${Date.now()}`,
          utm_source: body.utm_source,
          utm_medium: body.utm_medium,
          utm_campaign: body.utm_campaign,
          referrer: body.referrer,
          part_exchange_interest: true,
          px_registration: body.registration.toUpperCase(),
        },
      })
      .select('id')
      .single()

    if (leadErr) throw leadErr

    // Create PX appraisal draft
    try {
      await supabase.from('part_exchanges').insert({
        dealership_id: dealership.id,
        customer_id: customerId,
        lead_id: lead.id,
        registration: body.registration.toUpperCase(),
        make: (lookupData.make as string) ?? body.make ?? null,
        model: (lookupData.model as string) ?? body.model ?? null,
        year: (lookupData.year as number) ?? body.year ?? null,
        mileage: body.mileage,
        fuel_type: (lookupData.fuel_type as string) ?? body.fuel_type ?? null,
        transmission: body.transmission ?? null,
        colour: (lookupData.colour as string) ?? body.colour ?? null,
        condition: body.condition,
        finance_outstanding: body.finance_outstanding,
        finance_settlement: body.finance_settlement ?? null,
        status: 'enquiry',
        provenance: hasLookupData ? 'dvla' : 'customer_declared',
        notes: body.additional_notes ?? null,
      })
    } catch {
      // non-fatal if part_exchanges differences exist
    }

    // Track event
    WebsiteEventsService.track({
      dealership_id: dealership.id,
      event_type: 'px_submitted',
      utm_source: body.utm_source ?? null,
      referrer: body.referrer ?? null,
      metadata: { registration: body.registration, has_lookup: hasLookupData },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      reference: lead.id,
      hasLookupData,
      message: 'Thank you — a member of our team will be in touch with your part exchange valuation shortly.',
    })
  } catch (err: any) {
    console.error('[public/part-exchange]', err)
    return NextResponse.json(
      { error: 'Unable to submit your part exchange enquiry. Please try again.' },
      { status: 500 }
    )
  }
}
