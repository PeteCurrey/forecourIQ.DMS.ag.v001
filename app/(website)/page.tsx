import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { PublicStockService } from '@/lib/services/website/public-stock'
import SectionRenderer from '@/components/website/section-renderer'
import type { PublicDealer } from '@/lib/types/public-website'

export async function generateMetadata() {
  return {
    title: 'Quality Used Cars | Competitive Vehicle Finance',
    description: 'Browse our complete range of quality used cars. Complete mechanical inspection, competitive finance and part-exchange available.',
  }
}

export default async function WebsiteHomepage() {
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  let dealer: PublicDealer | null = null
  let featuredVehicles: any[] = []
  let availableMakes: string[] = []

  if (targetId) {
    dealer = await WebsiteService.getPublicDealer(targetId)
    const website = await WebsiteService.getOrCreate(targetId)
    const websiteConfig = {
      online_reservations_enabled: website.online_reservations_enabled,
      reservation_deposit_amount: website.reservation_deposit_amount,
      show_registration: website.show_registration,
      reserved_vehicle_policy: website.reserved_vehicle_policy,
    }

    const [fv, am] = await Promise.all([
      PublicStockService.getFeatured(targetId, 6, websiteConfig),
      PublicStockService.getAvailableMakes(targetId),
    ])

    featuredVehicles = fv
    availableMakes = am
  }

  const defaultDealer: PublicDealer = {
    id: 'default',
    name: 'Premier Motor Group',
    slug: 'premier-motor-group',
    address_line1: '124 Automotive Way',
    address_line2: null,
    city: 'Manchester',
    county: 'Greater Manchester',
    postcode: 'M1 2AB',
    phone: '0161 555 0199',
    email: 'sales@premiermotorgroup.co.uk',
    website_url: null,
    fca_number: '123456',
    logo_url: null,
    logo_dark_url: null,
    favicon_url: null,
    primary_colour: '#0EA5E9',
    accent_colour: '#F97316',
    theme_preset: 'contemporary',
    font_heading: 'Inter',
    font_body: 'Inter',
    online_reservations_enabled: true,
    reservation_deposit_amount: 299,
    reservation_duration_hours: 72,
    reservation_policy_text: null,
    finance_display_mode: 'on_request',
    show_registration: false,
    proposition_headline: null,
    proposition_body: null,
    hero_title: null,
    hero_subtitle: null,
    hero_cta_text: 'Browse Our Stock',
    hero_cta_url: '/used-cars',
    hero_image_url: null,
    homepage_sections: [
      { type: 'hero', enabled: true, order: 1 },
      { type: 'search', enabled: true, order: 2 },
      { type: 'featured_vehicles', enabled: true, order: 3 },
      { type: 'proposition', enabled: true, order: 4 },
      { type: 'finance_cta', enabled: true, order: 5 },
      { type: 'px_cta', enabled: true, order: 6 },
      { type: 'location', enabled: true, order: 7 },
    ],
    social_facebook: null,
    social_instagram: null,
    social_twitter_x: null,
    social_youtube: null,
    social_google_business: null,
    opening_hours: null,
    stock_count: 12,
  }

  const activeDealer = dealer || defaultDealer

  return (
    <SectionRenderer
      sections={activeDealer.homepage_sections}
      dealer={activeDealer}
      featuredVehicles={featuredVehicles}
      availableMakes={availableMakes}
    />
  )
}
