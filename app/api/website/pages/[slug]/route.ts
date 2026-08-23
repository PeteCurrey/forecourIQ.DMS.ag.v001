import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/permissions'
import { AuditService } from '@/lib/services/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const { data: page, error } = await supabase
      .from('website_pages')
      .select('*')
      .eq('dealership_id', profile.dealership_id)
      .eq('slug', slug)
      .maybeSingle()

    if (error || !page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    return NextResponse.json({ page })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    await requirePermission(profile.dealership_id, user.id, 'website.edit')
    const updates = await req.json()

    const { data: page, error } = await supabase
      .from('website_pages')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('dealership_id', profile.dealership_id)
      .eq('slug', slug)
      .select('*')
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'website.page_updated',
      entity_type: 'website_page',
      entity_id: page.id,
      metadata: { slug, updates: Object.keys(updates) },
    })

    return NextResponse.json({ page })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    await requirePermission(profile.dealership_id, user.id, 'website.edit')

    const { error } = await supabase
      .from('website_pages')
      .delete()
      .eq('dealership_id', profile.dealership_id)
      .eq('slug', slug)

    if (error) throw error

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'website.page_deleted',
      entity_type: 'website_page',
      metadata: { slug },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
