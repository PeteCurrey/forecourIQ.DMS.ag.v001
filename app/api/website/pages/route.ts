import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { requirePermission } from '@/lib/rbac/permissions'
import { AuditService } from '@/lib/services/audit'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const { data: pages, error } = await supabase
      .from('website_pages')
      .select('*')
      .eq('dealership_id', profile.dealership_id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ pages: pages ?? [] })
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

    await requirePermission(profile.dealership_id, user.id, 'website.edit')

    const body = await req.json()
    const website = await WebsiteService.getOrCreate(profile.dealership_id)

    const { data: page, error } = await supabase
      .from('website_pages')
      .insert({
        dealership_id: profile.dealership_id,
        website_id: website.id,
        slug: body.slug,
        title: body.title,
        meta_title: body.meta_title ?? null,
        meta_description: body.meta_description ?? null,
        page_type: body.page_type ?? 'custom',
        sections: body.sections ?? [],
        status: body.status ?? 'draft',
      })
      .select('*')
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'website.page_created',
      entity_type: 'website_page',
      entity_id: page.id,
      metadata: { slug: page.slug, title: page.title },
    })

    return NextResponse.json({ page }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
