import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PublicStockService } from '@/lib/services/website/public-stock'
import { WebsiteService } from '@/lib/services/website/website-service'
import { WebsiteEventsService } from '@/lib/services/website/website-events'
import type { PublicStockFilters } from '@/lib/types/public-website'

export async function GET(req: NextRequest) {
  try {
    const dealershipId = req.headers.get('x-dealership-id')
    const slugParam = req.nextUrl.searchParams.get('dealership')

    let resolvedDealershipId = dealershipId
    if (!resolvedDealershipId && slugParam) {
      const supabase = await createClient()
      const { data } = await supabase.from('dealerships').select('id').eq('slug', slugParam).single()
      resolvedDealershipId = data?.id ?? null
    }

    if (!resolvedDealershipId) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    const sp = req.nextUrl.searchParams
    const filters: PublicStockFilters = {
      make: sp.get('make') ?? undefined,
      model: sp.get('model') ?? undefined,
      fuel_type: sp.get('fuel_type') ?? undefined,
      transmission: sp.get('transmission') ?? undefined,
      body_type: sp.get('body_type') ?? undefined,
      min_price: sp.get('min_price') ? Number(sp.get('min_price')) : undefined,
      max_price: sp.get('max_price') ? Number(sp.get('max_price')) : undefined,
      min_year: sp.get('min_year') ? Number(sp.get('min_year')) : undefined,
      max_year: sp.get('max_year') ? Number(sp.get('max_year')) : undefined,
      max_mileage: sp.get('max_mileage') ? Number(sp.get('max_mileage')) : undefined,
      sort: (sp.get('sort') as PublicStockFilters['sort']) ?? 'newest',
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      per_page: sp.get('per_page') ? Number(sp.get('per_page')) : 24,
    }

    const website = await WebsiteService.getOrCreate(resolvedDealershipId)
    const websiteConfig = {
      online_reservations_enabled: website.online_reservations_enabled,
      reservation_deposit_amount: website.reservation_deposit_amount,
      show_registration: website.show_registration,
      reserved_vehicle_policy: website.reserved_vehicle_policy,
    }

    const [result, makes, priceRange] = await Promise.all([
      PublicStockService.list(resolvedDealershipId, filters, websiteConfig),
      PublicStockService.getAvailableMakes(resolvedDealershipId),
      PublicStockService.getPriceRange(resolvedDealershipId),
    ])

    WebsiteEventsService.track({
      dealership_id: resolvedDealershipId,
      event_type: 'search',
      utm_source: sp.get('utm_source') ?? undefined,
      utm_medium: sp.get('utm_medium') ?? undefined,
      utm_campaign: sp.get('utm_campaign') ?? undefined,
      metadata: { filters, results_count: result.total },
    }).catch(() => {})

    return NextResponse.json(
      { ...result, available_makes: makes, price_range: priceRange },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (err: any) {
    console.error('[public/stock]', err)
    return NextResponse.json({ error: 'Failed to load stock' }, { status: 500 })
  }
}
