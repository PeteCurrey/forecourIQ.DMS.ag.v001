import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import type { PublicDealer, HomepageSection } from '@/lib/types/public-website'

export interface DealerWebsiteRecord {
  id: string
  dealership_id: string
  status: string
  theme_preset: string
  primary_colour: string
  accent_colour: string
  background_preference: string
  font_heading: string
  font_body: string
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  hero_title: string | null
  hero_subtitle: string | null
  hero_cta_text: string
  hero_cta_url: string
  hero_image_url: string | null
  homepage_sections: HomepageSection[]
  proposition_headline: string | null
  proposition_body: string | null
  reserved_vehicle_policy: string
  show_registration: boolean
  online_reservations_enabled: boolean
  reservation_deposit_amount: number | null
  reservation_duration_hours: number
  reservation_policy_text: string | null
  finance_display_mode: string
  ga4_measurement_id: string | null
  plausible_domain: string | null
  social_facebook: string | null
  social_instagram: string | null
  social_twitter_x: string | null
  social_youtube: string | null
  social_google_business: string | null
  published_at: string | null
  published_by: string | null
  created_at: string
  updated_at: string
}

export const WebsiteService = {
  /**
   * Get or create a website config for a dealership.
   * Always returns a record — creates a default if none exists.
   */
  async getOrCreate(dealershipId: string): Promise<DealerWebsiteRecord> {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('dealer_websites')
      .select('*')
      .eq('dealership_id', dealershipId)
      .maybeSingle()

    if (existing) return existing as DealerWebsiteRecord

    // Create default
    const { data: created, error } = await supabase
      .from('dealer_websites')
      .insert({
        dealership_id: dealershipId,
        status: 'not_configured',
        theme_preset: 'contemporary',
        homepage_sections: [
          { type: 'hero', enabled: true, order: 1 },
          { type: 'search', enabled: true, order: 2 },
          { type: 'featured_vehicles', enabled: true, order: 3 },
          { type: 'proposition', enabled: true, order: 4 },
          { type: 'finance_cta', enabled: true, order: 5 },
          { type: 'px_cta', enabled: true, order: 6 },
          { type: 'location', enabled: true, order: 7 },
        ],
      })
      .select('*')
      .single()

    if (error) throw new Error(`WebsiteService.getOrCreate: ${error.message}`)
    return created as DealerWebsiteRecord
  },

  /**
   * Update website configuration.
   */
  async update(
    dealershipId: string,
    userId: string,
    updates: Partial<DealerWebsiteRecord>
  ): Promise<DealerWebsiteRecord> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('dealer_websites')
      .update({
        ...updates,
        last_updated_at: new Date().toISOString(),
        last_updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .select('*')
      .single()

    if (error) throw new Error(`WebsiteService.update: ${error.message}`)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'website.config_updated',
      entity_type: 'dealer_website',
      entity_id: data.id,
      metadata: { fields_updated: Object.keys(updates) },
    })

    return data as DealerWebsiteRecord
  },

  /**
   * Publish the website — transition to live state.
   */
  async publish(dealershipId: string, userId: string): Promise<DealerWebsiteRecord> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('dealer_websites')
      .update({
        status: 'live',
        published_at: new Date().toISOString(),
        published_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .select('*')
      .single()

    if (error) throw new Error(`WebsiteService.publish: ${error.message}`)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'website.published',
      entity_type: 'dealer_website',
      entity_id: data.id,
      metadata: { published_at: data.published_at },
    })

    return data as DealerWebsiteRecord
  },

  /**
   * Build the PublicDealer object from dealership + website config.
   * Only safe public fields — no internal financial or compliance data.
   */
  async getPublicDealer(dealershipId: string): Promise<PublicDealer | null> {
    const supabase = await createClient()

    const [dealershipRes, websiteRes, stockCountRes] = await Promise.all([
      supabase.from('dealerships').select('*').eq('id', dealershipId).single(),
      supabase.from('dealer_websites').select('*').eq('dealership_id', dealershipId).maybeSingle(),
      supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('dealership_id', dealershipId)
        .eq('website_ready', true)
        .in('status', ['advertised', 'available', 'reserved']),
    ])

    if (!dealershipRes.data) return null
    const d = dealershipRes.data
    const w = websiteRes.data

    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      address_line1: d.address_line1 ?? null,
      address_line2: d.address_line2 ?? null,
      city: d.city ?? null,
      county: d.county ?? null,
      postcode: d.postcode ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      website_url: d.website_url ?? null,
      fca_number: d.fca_number ?? null,

      logo_url: w?.logo_url ?? d.logo_url ?? null,
      logo_dark_url: w?.logo_dark_url ?? null,
      favicon_url: w?.favicon_url ?? null,
      primary_colour: w?.primary_colour ?? d.primary_colour ?? '#0EA5E9',
      accent_colour: w?.accent_colour ?? '#F97316',
      theme_preset: w?.theme_preset ?? 'contemporary',
      font_heading: w?.font_heading ?? 'Inter',
      font_body: w?.font_body ?? 'Inter',

      online_reservations_enabled: w?.online_reservations_enabled ?? false,
      reservation_deposit_amount: w?.reservation_deposit_amount ?? null,
      reservation_duration_hours: w?.reservation_duration_hours ?? 72,
      reservation_policy_text: w?.reservation_policy_text ?? null,
      finance_display_mode: (w?.finance_display_mode as 'live' | 'on_request' | 'hidden') ?? 'on_request',
      show_registration: w?.show_registration ?? false,

      proposition_headline: w?.proposition_headline ?? null,
      proposition_body: w?.proposition_body ?? null,

      hero_title: w?.hero_title ?? `Welcome to ${d.name}`,
      hero_subtitle: w?.hero_subtitle ?? null,
      hero_cta_text: w?.hero_cta_text ?? 'View Our Stock',
      hero_cta_url: w?.hero_cta_url ?? '/used-cars',
      hero_image_url: w?.hero_image_url ?? null,

      homepage_sections: (w?.homepage_sections as HomepageSection[]) ?? [],

      social_facebook: w?.social_facebook ?? null,
      social_instagram: w?.social_instagram ?? null,
      social_twitter_x: w?.social_twitter_x ?? null,
      social_youtube: w?.social_youtube ?? null,
      social_google_business: w?.social_google_business ?? null,

      opening_hours: null, // Phase 7+ — from dealership_locations

      stock_count: stockCountRes.count ?? 0,
    }
  },

  /**
   * Get website analytics summary for a date range.
   */
  async getAnalytics(
    dealershipId: string,
    from: string,
    to: string
  ): Promise<{
    events: Record<string, number>
    topVehicles: { vehicle_id: string; views: number }[]
    topSearches: { query: string; count: number }[]
    totalLeads: number
  }> {
    const supabase = await createClient()

    const { data: events } = await supabase
      .from('website_events')
      .select('event_type, vehicle_id, metadata')
      .eq('dealership_id', dealershipId)
      .gte('created_at', from)
      .lte('created_at', to)

    const eventCounts: Record<string, number> = {}
    const vehicleViews: Record<string, number> = {}

    for (const ev of events ?? []) {
      eventCounts[ev.event_type] = (eventCounts[ev.event_type] ?? 0) + 1
      if (ev.event_type === 'vehicle_view' && ev.vehicle_id) {
        vehicleViews[ev.vehicle_id] = (vehicleViews[ev.vehicle_id] ?? 0) + 1
      }
    }

    const topVehicles = Object.entries(vehicleViews)
      .map(([vehicle_id, views]) => ({ vehicle_id, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Count leads from website
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId)
      .eq('source', 'dealer_website')
      .gte('created_at', from)
      .lte('created_at', to)

    return {
      events: eventCounts,
      topVehicles,
      topSearches: [],
      totalLeads: totalLeads ?? 0,
    }
  },
}
