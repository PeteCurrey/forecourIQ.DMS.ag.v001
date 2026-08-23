import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'

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

    const dealer = await WebsiteService.getPublicDealer(resolvedDealershipId)

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    return NextResponse.json(
      { dealer },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err: any) {
    console.error('[public/dealer]', err)
    return NextResponse.json({ error: 'Failed to load dealer info' }, { status: 500 })
  }
}
