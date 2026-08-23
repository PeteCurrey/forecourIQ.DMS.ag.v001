import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PricingService } from '@/lib/services/intelligence/pricing-service'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const body = await request.json()
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

    if (!body.new_price || isNaN(Number(body.new_price))) {
      return NextResponse.json({ error: 'Valid new price is required' }, { status: 400 })
    }

    await PricingService.applyPricingSignal(
      profile.dealership_id,
      user.id,
      id,
      Number(body.new_price)
    )

    return NextResponse.json({ success: true, new_price: Number(body.new_price) })
  } catch (err: any) {
    console.error('[api/intelligence/pricing/apply]', err)
    return NextResponse.json({ error: err.message || 'Failed to apply price change' }, { status: 500 })
  }
}
