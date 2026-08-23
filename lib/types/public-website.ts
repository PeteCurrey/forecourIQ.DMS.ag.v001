/**
 * Public Website Data Transfer Objects
 *
 * CRITICAL RULE: These types are the ONLY shape of data that may be returned
 * through public (unauthenticated) API routes.
 *
 * Never include: cost, purchase_price, margin, internal_notes, supplier,
 * auction, finance_details, compliance data, or any other internal field.
 */

// ─── VEHICLE ──────────────────────────────────────────────────────────────────

export interface PublicVehicleImage {
  url: string
  is_primary: boolean
  alt: string
}

export interface PublicVehicle {
  id: string
  slug: string
  make: string
  model: string
  variant: string | null
  year: number
  mileage: number
  colour: string | null
  fuel_type: string | null
  transmission: string | null
  body_type: string | null
  doors: number | null
  engine_size: string | null
  co2_g_per_km: number | null
  mot_expiry: string | null
  service_history: string | null

  asking_price: number
  asking_price_display: string | null  // e.g. "£18,995" or "POA"

  advert_headline: string | null
  website_description: string | null
  highlights: string[]

  images: PublicVehicleImage[]
  primary_image_url: string | null

  status: 'available' | 'advertised' | 'reserved' | 'sold'
  is_featured: boolean

  // Availability display
  is_reservable: boolean        // website has reservations enabled + vehicle is available
  reservation_deposit: number | null

  // Attribution fields (not persisted, just passed through)
  created_at: string
  updated_at: string
}

export interface PublicVehicleListResponse {
  vehicles: PublicVehicle[]
  total: number
  page: number
  per_page: number
  filters_applied: PublicStockFilters
}

export interface PublicStockFilters {
  make?: string
  model?: string
  min_price?: number
  max_price?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  min_year?: number
  max_year?: number
  max_mileage?: number
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'mileage_asc' | 'year_desc'
  page?: number
  per_page?: number
}

// ─── DEALER ───────────────────────────────────────────────────────────────────

export interface PublicOpeningHours {
  monday?: string | null
  tuesday?: string | null
  wednesday?: string | null
  thursday?: string | null
  friday?: string | null
  saturday?: string | null
  sunday?: string | null
}

export interface PublicDealer {
  id: string
  name: string
  slug: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  fca_number: string | null

  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  primary_colour: string
  accent_colour: string
  theme_preset: string
  font_heading: string
  font_body: string

  online_reservations_enabled: boolean
  reservation_deposit_amount: number | null
  reservation_duration_hours: number
  reservation_policy_text: string | null
  finance_display_mode: 'live' | 'on_request' | 'hidden'
  show_registration: boolean

  proposition_headline: string | null
  proposition_body: string | null

  hero_title: string | null
  hero_subtitle: string | null
  hero_cta_text: string
  hero_cta_url: string
  hero_image_url: string | null

  homepage_sections: HomepageSection[]

  social_facebook: string | null
  social_instagram: string | null
  social_twitter_x: string | null
  social_youtube: string | null
  social_google_business: string | null

  opening_hours: PublicOpeningHours | null

  // Stock summary
  stock_count: number
}

// ─── HOMEPAGE SECTIONS ────────────────────────────────────────────────────────

export type HomepageSectionType =
  | 'hero'
  | 'search'
  | 'featured_vehicles'
  | 'proposition'
  | 'finance_cta'
  | 'px_cta'
  | 'location'
  | 'reviews'
  | 'team'
  | 'latest_stock'
  | 'recently_reduced'
  | 'text_image'

export interface HomepageSection {
  type: HomepageSectionType
  enabled: boolean
  order: number
  config?: Record<string, unknown>
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────

export interface PublicFinanceExample {
  isLive: boolean
  provider: string | null
  monthly_payment: number | null
  apr: number | null
  deposit_shown: number | null
  term_months: number | null
  total_charge_for_credit: number | null
  final_balloon: number | null
  representative_example: string | null
  disclaimer: string
  retrieved_at: string | null
}

// ─── LEAD FORMS ───────────────────────────────────────────────────────────────

export interface PublicEnquiryPayload {
  dealership_slug: string
  vehicle_slug?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  message: string
  preferred_contact: 'email' | 'phone' | 'any'
  marketing_consent: boolean
  // UTM attribution
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  referrer?: string
  landing_page?: string
}

export interface PublicEnquiryResponse {
  success: boolean
  reference?: string
  message: string
}

// ─── PART EXCHANGE ────────────────────────────────────────────────────────────

export interface PublicPXPayload {
  dealership_slug: string
  // Vehicle details
  registration: string
  make?: string
  model?: string
  year?: number
  mileage: number
  fuel_type?: string
  transmission?: string
  colour?: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  finance_outstanding: boolean
  finance_settlement?: number | null
  additional_notes?: string
  // Customer
  first_name: string
  last_name: string
  email: string
  phone?: string
  // Interested in vehicle?
  interested_vehicle_slug?: string
  // Consent
  marketing_consent: boolean
  // Attribution
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referrer?: string
}

export interface PublicPXResponse {
  success: boolean
  reference?: string
  message: string
  hasLookupData: boolean
}

// ─── RESERVATION ──────────────────────────────────────────────────────────────

export interface PublicReservationPayload {
  dealership_slug: string
  vehicle_slug: string
  first_name: string
  last_name: string
  email: string
  phone: string
  notes?: string
  marketing_consent: boolean
}

export interface PublicReservationResponse {
  success: boolean
  checkout_url?: string   // Stripe checkout URL
  reservation_id?: string
  message: string
}

// ─── MERCHANDISING SCORE ──────────────────────────────────────────────────────

export interface MerchandisingScore {
  score: number
  max: number
  percentage: number
  isReady: boolean
  checks: MerchandisingCheck[]
}

export interface MerchandisingCheck {
  label: string
  passed: boolean
  required: boolean
}
