import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IQIntelligenceBridge } from '@/lib/services/intelligence/iq-intelligence'

export async function POST(request: NextRequest) {
  try {
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

    if (body.question) {
      const answer = await IQIntelligenceBridge.askMarketQuestion(
        profile.dealership_id,
        user.id,
        body.question
      )
      return NextResponse.json({ answer })
    }

    if (body.signal_type && body.signal_id) {
      const explanation = await IQIntelligenceBridge.explainSignal(
        profile.dealership_id,
        user.id,
        body.signal_type,
        body.signal_id
      )
      return NextResponse.json(explanation)
    }

    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/intelligence/explain POST]', err)
    return NextResponse.json({ error: err.message || 'Failed to generate explanation' }, { status: 500 })
  }
}
