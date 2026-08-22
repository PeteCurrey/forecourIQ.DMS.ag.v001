import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { toApiErrorResponse, AuthenticationError, ForbiddenError, ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthenticationError()
    }

    const body = await req.json()
    const { dealershipId, ...data } = body

    if (!data.name && !dealershipId) {
      throw new ValidationError('Dealership name is required.')
    }

    // Auto-generate slug if not provided
    if (data.name && !data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    }

    let dealership: unknown

    if (dealershipId) {
      // Verify current user belongs to the dealership they are updating
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single()

      if (profile?.dealership_id && profile.dealership_id !== dealershipId) {
        throw new ForbiddenError('You cannot modify another dealership.')
      }

      // UPDATE existing dealership
      const { data: updated, error } = await supabaseAdmin
        .from('dealerships')
        .update(data)
        .eq('id', dealershipId)
        .select()
        .single()

      if (error) throw error
      dealership = updated
    } else {
      // INSERT new dealership
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
        .update({ dealership_id: created.id })
        .eq('id', user.id)

      if (profileError) throw profileError
    }

    return NextResponse.json({ dealership })
  } catch (error: unknown) {
    const { body: errBody, status: errStatus } = toApiErrorResponse(error)
    return NextResponse.json(errBody, { status: errStatus })
  }
}
