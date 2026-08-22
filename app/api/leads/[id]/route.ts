import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadService } from '@/lib/services/lead'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const lead = await LeadService.getById(profile.dealership_id, id)
    return NextResponse.json({ lead })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const body = await req.json()

    // 1. If updating status specifically
    if (body.status !== undefined) {
      const updated = await LeadService.updateStatus(
        profile.dealership_id,
        id,
        body.status,
        user.id,
        body.reason,
        body.close_notes
      )
      return NextResponse.json({ lead: updated })
    }

    // 2. If reassigning salesperson
    if (body.assigned_to !== undefined) {
      const updated = await LeadService.assign(
        profile.dealership_id,
        id,
        body.assigned_to || null,
        user.id
      )
      return NextResponse.json({ lead: updated })
    }

    // 3. General attribute updates (temperature, priority, next_action, notes)
    const updated = await LeadService.update(profile.dealership_id, id, body, user.id)
    return NextResponse.json({ lead: updated })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
