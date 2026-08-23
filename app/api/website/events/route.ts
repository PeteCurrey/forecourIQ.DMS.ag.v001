import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebsiteEventsService } from '@/lib/services/website/website-events'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dealership_slug, event_type, vehicle_id, session_id, metadata, ...attribution } = body

    if (!dealership_slug || !event_type) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: dealership } = await supabase
      .from('dealerships')
      .select('id')
      .eq('slug', dealership_slug)
      .single()

    if (!dealership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await WebsiteEventsService.track({
      dealership_id: dealership.id,
      vehicle_id: vehicle_id ?? null,
      event_type,
      session_id: session_id ?? null,
      metadata: metadata ?? {},
      ...attribution,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // always return 200 for analytics
  }
}
