import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import WebsiteNav from '@/components/website/website-nav'
import WebsiteFooter from '@/components/website/website-footer'
import type { PublicDealer } from '@/lib/types/public-website'

export const metadata = {
  title: 'Quality Used Cars & Vehicle Finance',
  description: 'Browse our curated collection of quality checked used cars with competitive finance and part-exchange options.',
}

async function getDealership(): Promise<PublicDealer | null> {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const dealershipId = headersList.get('x-dealership-id')

  const supabase = await createClient()

  let targetId = dealershipId

  // If no header from middleware, check if host is mapped
  if (!targetId && host) {
    const cleanHost = host.split(':')[0].toLowerCase()
    const { data: domainRec } = await supabase
      .from('website_domains')
      .select('dealership_id')
      .eq('domain', cleanHost)
      .eq('status', 'active')
      .maybeSingle()

    targetId = domainRec?.dealership_id
  }

  // Fallback: load the first active dealership for demo/preview
  if (!targetId) {
    const { data: demo } = await supabase
      .from('dealerships')
      .select('id')
      .limit(1)
      .maybeSingle()
    targetId = demo?.id
  }

  if (!targetId) return null

  return WebsiteService.getPublicDealer(targetId)
}

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const dealer = await getDealership()

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
    <div className="min-h-screen flex flex-col bg-white text-gray-900 antialiased font-sans">
      <WebsiteNav dealer={activeDealer} />
      <main className="flex-1">{children}</main>
      <WebsiteFooter dealer={activeDealer} />
    </div>
  )
}
