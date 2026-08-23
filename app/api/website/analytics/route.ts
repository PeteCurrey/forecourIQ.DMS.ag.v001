import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const sp = req.nextUrl.searchParams
    const from = sp.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
    const to = sp.get('to') ?? new Date().toISOString()

    const analytics = await WebsiteService.getAnalytics(profile.dealership_id, from, to)
    return NextResponse.json({ analytics })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
