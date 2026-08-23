import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PublicStockService } from '@/lib/services/website/public-stock'
import { WebsiteService } from '@/lib/services/website/website-service'
import { WebsiteEventsService } from '@/lib/services/website/website-events'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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

    const website = await WebsiteService.getOrCreate(resolvedDealershipId)
    const websiteConfig = {
      online_reservations_enabled: website.online_reservations_enabled,
      reservation_deposit_amount: website.reservation_deposit_amount,
      show_registration: website.show_registration,
      reserved_vehicle_policy: website.reserved_vehicle_policy,
    }

    const vehicle = await PublicStockService.getBySlug(resolvedDealershipId, slug, websiteConfig)

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Track view (fire and forget)
    WebsiteEventsService.track({
      dealership_id: resolvedDealershipId,
      vehicle_id: vehicle.id,
      event_type: 'vehicle_view',
      metadata: { slug, make: vehicle.make, model: vehicle.model },
    }).catch(() => {})

    return NextResponse.json(
      { vehicle },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    )
  } catch (err: any) {
    console.error('[public/stock/slug]', err)
    return NextResponse.json({ error: 'Failed to load vehicle' }, { status: 500 })
  }
}
