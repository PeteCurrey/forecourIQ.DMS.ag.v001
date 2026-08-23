import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PricingService } from '@/lib/services/intelligence/pricing-service'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const body = await request.json().catch(() => ({}))
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

    await PricingService.dismissPricingSignal(
      profile.dealership_id,
      user.id,
      id,
      body.dismissed_reason
    )

    return NextResponse.json({ success: true, status: 'dismissed' })
  } catch (err: any) {
    console.error('[api/intelligence/pricing/dismiss]', err)
    return NextResponse.json({ error: err.message || 'Failed to dismiss pricing signal' }, { status: 500 })
  }
}
