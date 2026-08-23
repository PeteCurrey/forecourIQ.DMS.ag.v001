import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DomainService } from '@/lib/services/website/domain-service'
import { WebsiteService } from '@/lib/services/website/website-service'
import { requirePermission } from '@/lib/rbac/permissions'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const domains = await DomainService.getDomains(profile.dealership_id)
    return NextResponse.json({ domains })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    await requirePermission(profile.dealership_id, user.id, 'website.domains')

    const { domain, is_primary = true } = await req.json()
    if (!domain) return NextResponse.json({ error: 'Domain is required.' }, { status: 400 })

    const website = await WebsiteService.getOrCreate(profile.dealership_id)
    const newDomain = await DomainService.addDomain(profile.dealership_id, website.id, user.id, domain, is_primary)

    return NextResponse.json({ domain: newDomain }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('already in use') ? 409 : 500 })
  }
}
