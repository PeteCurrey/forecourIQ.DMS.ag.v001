import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { PublicStockService } from '@/lib/services/website/public-stock'
import { requirePermission } from '@/lib/rbac/permissions'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    await requirePermission(profile.dealership_id, user.id, 'website.publish')

    // Backfill slugs before publishing
    const slugsUpdated = await PublicStockService.backfillSlugs(profile.dealership_id)
    const website = await WebsiteService.publish(profile.dealership_id, user.id)

    return NextResponse.json({ website, slugs_backfilled: slugsUpdated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Missing') ? 403 : 500 })
  }
}
