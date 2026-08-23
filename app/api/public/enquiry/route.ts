import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadIngestionService } from '@/lib/services/integrations/lead-ingestion'
import { WebsiteEventsService } from '@/lib/services/website/website-events'
import type { PublicEnquiryPayload } from '@/lib/types/public-website'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PublicEnquiryPayload & { website?: string }

    // Honeypot spam check
    if (body.website) {
      // Bot filled the honeypot — silently return success
      return NextResponse.json({ success: true, message: 'Enquiry received.' })
    }

    // Resolve dealership
    const supabase = await createClient()
    const { data: dealership } = await supabase
      .from('dealerships')
      .select('id')
      .eq('slug', body.dealership_slug)
      .single()

    if (!dealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    // Basic validation
    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Resolve vehicle if slug provided
    let vehicleId: string | undefined
    if (body.vehicle_slug) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('dealership_id', dealership.id)
        .eq('website_slug', body.vehicle_slug)
        .single()
      vehicleId = vehicle?.id
    }

    // Ingest lead via LeadIngestionService
    const result = await LeadIngestionService.ingestLead({
      dealership_id: dealership.id,
      provider_id: 'dealer_website',
      external_lead_id: `website_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() ?? undefined,
      vehicle_id: vehicleId,
      message: body.message.trim(),
      source_channel: 'dealer_website',
      raw_payload: {
        preferred_contact: body.preferred_contact,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign,
        utm_content: body.utm_content,
        utm_term: body.utm_term,
        referrer: body.referrer,
        landing_page: body.landing_page,
        marketing_consent: body.marketing_consent,
      },
    })

    // Track event
    WebsiteEventsService.track({
      dealership_id: dealership.id,
      vehicle_id: vehicleId ?? null,
      event_type: 'enquiry_submitted',
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      referrer: body.referrer ?? null,
      landing_page: body.landing_page ?? null,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      reference: result.leadId,
      message: 'Thank you for your enquiry. A member of our team will be in touch shortly.',
    })
  } catch (err: any) {
    console.error('[public/enquiry]', err)
    return NextResponse.json(
      { error: 'We were unable to process your enquiry. Please try again or call us directly.' },
      { status: 500 }
    )
  }
}
