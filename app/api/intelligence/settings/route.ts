import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StrategyService } from '@/lib/services/intelligence/strategy-service'

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

    const settings = await StrategyService.getSettings(profile.dealership_id)
    return NextResponse.json(settings)
  } catch (err: any) {
    console.error('[api/intelligence/settings GET]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch strategy settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const updated = await StrategyService.updateSettings(profile.dealership_id, user.id, body)
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[api/intelligence/settings PATCH]', err)
    return NextResponse.json({ error: err.message || 'Failed to update strategy settings' }, { status: 500 })
  }
}
