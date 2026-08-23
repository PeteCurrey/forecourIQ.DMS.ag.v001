import { createClient } from '@/lib/supabase/server'
import { generateVehicleSlug } from './merchandising'
import type {
  PublicVehicle,
  PublicVehicleListResponse,
  PublicStockFilters,
} from '@/lib/types/public-website'

/**
 * Map an internal vehicle DB row to a safe public DTO.
 * NEVER include: cost, purchase_price, margin, internal_notes, supplier, audit fields.
 */
function toPublicVehicle(
  row: Record<string, any>,
  websiteConfig: { online_reservations_enabled: boolean; reservation_deposit_amount: number | null; show_registration: boolean }
): PublicVehicle {
  const images = (row.vehicle_images ?? []).map((img: any) => ({
    url: img.url,
    is_primary: img.is_primary,
    alt: `${row.make} ${row.model} ${row.year}`,
  }))

  const primaryImage =
    images.find((i: any) => i.is_primary)?.url ??
    images[0]?.url ??
    null

  const isReservable =
    websiteConfig.online_reservations_enabled &&
    ['available', 'advertised'].includes(row.status)

  return {
    id: row.id,
    slug: row.website_slug ?? generateVehicleSlug({
      make: row.make,
      model: row.model,
      year: row.year,
      registration: row.registration || '',
      variant: row.variant,
    }),
    make: row.make,
    model: row.model,
    variant: row.variant ?? null,
    year: row.year,
    mileage: row.mileage,
    colour: row.colour ?? null,
    fuel_type: row.fuel_type ?? null,
    transmission: row.transmission ?? null,
    body_type: row.body_type ?? null,
    doors: row.doors ?? null,
    engine_size: row.engine_size ?? null,
    co2_g_per_km: row.co2_g_per_km ?? null,
    mot_expiry: row.mot_expiry ?? null,
    service_history: row.service_history ?? null,

    asking_price: Number(row.asking_price ?? 0),
    asking_price_display: row.asking_price_display ?? null,

    advert_headline: row.advert_headline ?? null,
    website_description: row.website_description ?? null,
    highlights: Array.isArray(row.highlights) ? row.highlights : [],

    images,
    primary_image_url: primaryImage,

    status: row.status as PublicVehicle['status'],
    is_featured: Boolean(row.featured),

    is_reservable: isReservable,
    reservation_deposit: isReservable ? websiteConfig.reservation_deposit_amount : null,

    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export const PublicStockService = {
  /**
   * List public inventory with filtering and pagination.
   * Only returns vehicles that are website_ready = true and in an advertised/available state.
   */
  async list(
    dealershipId: string,
    filters: PublicStockFilters = {},
    websiteConfig: { online_reservations_enabled: boolean; reservation_deposit_amount: number | null; show_registration: boolean; reserved_vehicle_policy: string }
  ): Promise<PublicVehicleListResponse> {
    const supabase = await createClient()

    const page = filters.page ?? 1
    const perPage = Math.min(filters.per_page ?? 24, 48)
    const offset = (page - 1) * perPage

    // Base query — public stock only
    let query = supabase
      .from('vehicles')
      .select(
        'id, website_slug, make, model, variant, year, mileage, colour, fuel_type, transmission, body_type, doors, engine_size, co2_g_per_km, mot_expiry, service_history, asking_price, asking_price_display, advert_headline, website_description, highlights, status, featured, created_at, updated_at, vehicle_images(url, is_primary)',
        { count: 'exact' }
      )
      .eq('dealership_id', dealershipId)
      .eq('website_ready', true)

    // Status filtering based on reserved vehicle policy
    if (websiteConfig.reserved_vehicle_policy === 'hide') {
      query = query.in('status', ['advertised', 'available'])
    } else {
      query = query.in('status', ['advertised', 'available', 'reserved'])
    }

    // Filters
    if (filters.make) query = query.ilike('make', `%${filters.make}%`)
    if (filters.model) query = query.ilike('model', `%${filters.model}%`)
    if (filters.fuel_type) query = query.eq('fuel_type', filters.fuel_type)
    if (filters.transmission) query = query.eq('transmission', filters.transmission)
    if (filters.body_type) query = query.eq('body_type', filters.body_type)
    if (filters.min_price !== undefined) query = query.gte('asking_price', filters.min_price)
    if (filters.max_price !== undefined) query = query.lte('asking_price', filters.max_price)
    if (filters.min_year !== undefined) query = query.gte('year', filters.min_year)
    if (filters.max_year !== undefined) query = query.lte('year', filters.max_year)
    if (filters.max_mileage !== undefined) query = query.lte('mileage', filters.max_mileage)

    // Sorting
    switch (filters.sort ?? 'newest') {
      case 'price_asc':
        query = query.order('asking_price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('asking_price', { ascending: false })
        break
      case 'mileage_asc':
        query = query.order('mileage', { ascending: true })
        break
      case 'year_desc':
        query = query.order('year', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + perPage - 1)

    const { data, count, error } = await query
    if (error) throw new Error(`PublicStockService.list: ${error.message}`)

    const vehicles = (data ?? []).map((row) =>
      toPublicVehicle(row, websiteConfig)
    )

    return {
      vehicles,
      total: count ?? 0,
      page,
      per_page: perPage,
      filters_applied: filters,
    }
  },

  /**
   * Get a single vehicle by its website slug.
   */
  async getBySlug(
    dealershipId: string,
    slug: string,
    websiteConfig: { online_reservations_enabled: boolean; reservation_deposit_amount: number | null; show_registration: boolean; reserved_vehicle_policy: string }
  ): Promise<PublicVehicle | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicles')
      .select(
        'id, website_slug, make, model, variant, year, mileage, colour, fuel_type, transmission, body_type, doors, engine_size, co2_g_per_km, mot_expiry, service_history, asking_price, asking_price_display, advert_headline, website_description, highlights, status, featured, created_at, updated_at, vehicle_images(url, is_primary)'
      )
      .eq('dealership_id', dealershipId)
      .eq('website_slug', slug)
      .eq('website_ready', true)
      .maybeSingle()

    if (error || !data) return null

    return toPublicVehicle(data, websiteConfig)
  },

  /**
   * Get featured vehicles for homepage.
   */
  async getFeatured(
    dealershipId: string,
    limit = 6,
    websiteConfig: { online_reservations_enabled: boolean; reservation_deposit_amount: number | null; show_registration: boolean; reserved_vehicle_policy: string }
  ): Promise<PublicVehicle[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('vehicles')
      .select(
        'id, website_slug, make, model, variant, year, mileage, colour, fuel_type, transmission, body_type, doors, engine_size, co2_g_per_km, mot_expiry, service_history, asking_price, asking_price_display, advert_headline, website_description, highlights, status, featured, created_at, updated_at, vehicle_images(url, is_primary)'
      )
      .eq('dealership_id', dealershipId)
      .eq('website_ready', true)
      .eq('featured', true)
      .in('status', ['advertised', 'available'])
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []).map((row) => toPublicVehicle(row, websiteConfig))
  },

  /**
   * Get recently added vehicles.
   */
  async getRecentlyAdded(
    dealershipId: string,
    limit = 6,
    websiteConfig: { online_reservations_enabled: boolean; reservation_deposit_amount: number | null; show_registration: boolean; reserved_vehicle_policy: string }
  ): Promise<PublicVehicle[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('vehicles')
      .select(
        'id, website_slug, make, model, variant, year, mileage, colour, fuel_type, transmission, body_type, doors, engine_size, co2_g_per_km, mot_expiry, service_history, asking_price, asking_price_display, advert_headline, website_description, highlights, status, featured, created_at, updated_at, vehicle_images(url, is_primary)'
      )
      .eq('dealership_id', dealershipId)
      .eq('website_ready', true)
      .in('status', ['advertised', 'available'])
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []).map((row) => toPublicVehicle(row, websiteConfig))
  },

  /**
   * Ensure all website-ready vehicles have a stable slug.
   * Called during publish flow — idempotent.
   */
  async backfillSlugs(dealershipId: string): Promise<number> {
    const supabase = await createClient()

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, make, model, variant, year, registration')
      .eq('dealership_id', dealershipId)
      .is('website_slug', null)

    let updated = 0
    for (const v of vehicles ?? []) {
      const slug = generateVehicleSlug(v)
      const { error } = await supabase
        .from('vehicles')
        .update({ website_slug: slug })
        .eq('id', v.id)

      if (!error) updated++
    }

    return updated
  },

  /**
   * Get distinct makes available in public stock (for search filter).
   */
  async getAvailableMakes(dealershipId: string): Promise<string[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('vehicles')
      .select('make')
      .eq('dealership_id', dealershipId)
      .eq('website_ready', true)
      .in('status', ['advertised', 'available', 'reserved'])
      .order('make')

    const makes = [...new Set((data ?? []).map((v) => v.make))].filter(Boolean)
    return makes as string[]
  },

  /**
   * Get price range for available stock.
   */
  async getPriceRange(dealershipId: string): Promise<{ min: number; max: number }> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('vehicles')
      .select('asking_price')
      .eq('dealership_id', dealershipId)
      .eq('website_ready', true)
      .in('status', ['advertised', 'available'])

    const prices = (data ?? []).map((v) => Number(v.asking_price)).filter((p) => p > 0)
    return {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    }
  },
}
