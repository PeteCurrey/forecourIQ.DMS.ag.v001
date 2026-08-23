import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompetitorService } from '@/lib/services/intelligence/competitor-service'

export async function DELETE(
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

    await CompetitorService.deleteCompetitor(profile.dealership_id, user.id, id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[api/intelligence/competitors/[id] DELETE]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete competitor' }, { status: 500 })
  }
}
