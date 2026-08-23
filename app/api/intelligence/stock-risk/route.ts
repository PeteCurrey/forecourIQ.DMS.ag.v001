import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StockRiskService } from '@/lib/services/intelligence/stock-risk-service'

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

    const [exposure, signals] = await Promise.all([
      StockRiskService.getCapitalExposureSummary(profile.dealership_id),
      StockRiskService.getStockRiskSignals(profile.dealership_id),
    ])

    return NextResponse.json({
      exposure,
      signals,
    })
  } catch (err: any) {
    console.error('[api/intelligence/stock-risk]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch stock risk intelligence' }, { status: 500 })
  }
}
