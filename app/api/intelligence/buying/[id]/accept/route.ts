import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BuyingService } from '@/lib/services/intelligence/buying-service'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
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

    await BuyingService.updateSignalStatus(profile.dealership_id, user.id, id, 'accepted')

    return NextResponse.json({ success: true, status: 'accepted' })
  } catch (err: any) {
    console.error('[api/intelligence/buying/accept]', err)
    return NextResponse.json({ error: err.message || 'Failed to accept signal' }, { status: 500 })
  }
}
