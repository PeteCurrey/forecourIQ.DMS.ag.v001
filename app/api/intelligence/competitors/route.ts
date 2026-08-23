import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompetitorService } from '@/lib/services/intelligence/competitor-service'

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

    const [competitors, activity] = await Promise.all([
      CompetitorService.getCompetitors(profile.dealership_id),
      CompetitorService.getActivityFeed(profile.dealership_id),
    ])

    return NextResponse.json({
      competitors,
      activity,
    })
  } catch (err: any) {
    console.error('[api/intelligence/competitors GET]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch competitor intelligence' }, { status: 500 })
  }
}

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

    if (!body.name) {
      return NextResponse.json({ error: 'Competitor name is required' }, { status: 400 })
    }

    const comp = await CompetitorService.addCompetitor(profile.dealership_id, user.id, body)
    return NextResponse.json(comp, { status: 201 })
  } catch (err: any) {
    console.error('[api/intelligence/competitors POST]', err)
    return NextResponse.json({ error: err.message || 'Failed to create competitor' }, { status: 500 })
  }
}
