import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MarketService } from '@/lib/services/intelligence/market-service'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    const [overview, stockTurns, websiteDemand] = await Promise.all([
      MarketService.getMarketOverview(profile.dealership_id),
      MarketService.getStockTurnMetrics(profile.dealership_id),
      MarketService.getWebsiteDemandMetrics(profile.dealership_id),
    ])

    return NextResponse.json({
      overview,
      stockTurns,
      websiteDemand,
    })
  } catch (err: any) {
    console.error('[api/intelligence/market]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch market intelligence' }, { status: 500 })
  }
}
