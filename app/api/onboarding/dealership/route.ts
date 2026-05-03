import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { dealershipId, ...data } = body

    // Auto-generate slug if not provided
    if (!data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    }

    let dealership: any

    if (dealershipId) {
      // UPDATE existing dealership (bypass RLS via admin client)
      const { data: updated, error } = await supabaseAdmin
        .from('dealerships')
        .update(data)
        .eq('id', dealershipId)
        .select()
        .single()
      if (error) throw error
      dealership = updated
    } else {
      // INSERT new dealership (bypass RLS via admin client)
      const { data: created, error } = await supabaseAdmin
        .from('dealerships')
        .insert({ ...data })
        .select()
        .single()
      if (error) throw error
      dealership = created

      // Link the new dealership to the user's profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ dealership_id: dealership.id })
        .eq('id', user.id)
      if (profileError) throw profileError
    }

    return NextResponse.json({ dealership })
  } catch (error: any) {
    console.error('[onboarding/dealership]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
