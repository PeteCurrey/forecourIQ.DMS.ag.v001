import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PricingService } from '@/lib/services/intelligence/pricing-service'

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

    const signals = await PricingService.getPricingSignals(profile.dealership_id)
    return NextResponse.json(signals)
  } catch (err: any) {
    console.error('[api/intelligence/pricing]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch pricing intelligence' }, { status: 500 })
  }
}
