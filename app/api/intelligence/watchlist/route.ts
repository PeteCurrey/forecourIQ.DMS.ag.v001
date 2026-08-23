import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BuyingService } from '@/lib/services/intelligence/buying-service'

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

    const watchlist = await BuyingService.getWatchlist(profile.dealership_id)
    return NextResponse.json(watchlist)
  } catch (err: any) {
    console.error('[api/intelligence/watchlist GET]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch watchlist' }, { status: 500 })
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

    if (!body.make || !body.model) {
      return NextResponse.json({ error: 'Make and model are required' }, { status: 400 })
    }

    const item = await BuyingService.addToWatchlist(profile.dealership_id, user.id, body)
    return NextResponse.json(item, { status: 201 })
  } catch (err: any) {
    console.error('[api/intelligence/watchlist POST]', err)
    return NextResponse.json({ error: err.message || 'Failed to add watchlist item' }, { status: 500 })
  }
}
