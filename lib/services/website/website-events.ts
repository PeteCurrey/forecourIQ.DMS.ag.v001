import { createClient } from '@/lib/supabase/server'

export interface WebsiteEventPayload {
  dealership_id: string
  vehicle_id?: string | null
  event_type:
    | 'vehicle_view'
    | 'search'
    | 'enquiry_started'
    | 'enquiry_submitted'
    | 'px_started'
    | 'px_submitted'
    | 'finance_started'
    | 'reservation_started'
    | 'reservation_completed'
    | 'phone_click'
    | 'email_click'
    | 'whatsapp_click'
    | 'page_view'
    | 'cta_click'
  session_id?: string | null
  source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  referrer?: string | null
  landing_page?: string | null
  page_url?: string | null
  metadata?: Record<string, unknown>
}

export const WebsiteEventsService = {
  /**
   * Track a website event. Uses service role to allow unauthenticated inserts.
   * Sanitised — no PII stored beyond session_id.
   */
  async track(event: WebsiteEventPayload): Promise<void> {
    const supabase = await createClient()

    await supabase.from('website_events').insert({
      dealership_id: event.dealership_id,
      vehicle_id: event.vehicle_id ?? null,
      event_type: event.event_type,
      session_id: event.session_id ?? null,
      source: event.source ?? null,
      utm_source: event.utm_source ?? null,
      utm_medium: event.utm_medium ?? null,
      utm_campaign: event.utm_campaign ?? null,
      utm_content: event.utm_content ?? null,
      utm_term: event.utm_term ?? null,
      referrer: event.referrer ?? null,
      landing_page: event.landing_page ?? null,
      page_url: event.page_url ?? null,
      metadata: event.metadata ?? {},
    })
    // Fire and forget — do not throw on analytics failure
  },
}
