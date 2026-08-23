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

    const { data: redirects, error } = await supabase
      .from('website_redirects')
      .select('*')
      .eq('dealership_id', profile.dealership_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ redirects: redirects ?? [] })
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

    const { data: redirect, error } = await supabase
      .from('website_redirects')
      .insert({
        dealership_id: profile.dealership_id,
        website_id: website.id,
        from_path: body.from_path.trim(),
        to_path: body.to_path.trim(),
        status_code: body.status_code ?? 301,
        note: body.note ?? null,
      })
      .select('*')
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'website.redirect_created',
      entity_type: 'website_redirect',
      entity_id: redirect.id,
      metadata: { from: redirect.from_path, to: redirect.to_path },
    })

    return NextResponse.json({ redirect }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    await requirePermission(profile.dealership_id, user.id, 'website.edit')

    const { id } = await req.json()
    const { error } = await supabase
      .from('website_redirects')
      .delete()
      .eq('id', id)
      .eq('dealership_id', profile.dealership_id)

    if (error) throw error

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'website.redirect_deleted',
      entity_type: 'website_redirect',
      entity_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
