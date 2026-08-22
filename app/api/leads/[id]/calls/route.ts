import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadService } from '@/lib/services/lead'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function POST(
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
    const { direction = 'outbound', phoneNumber, durationSeconds = 0, outcome = 'connected', notes, customerId } = body

    const call = await LeadService.logCall(profile.dealership_id, id, {
      userId: user.id,
      customerId,
      direction,
      phoneNumber,
      durationSeconds: Number(durationSeconds),
      outcome,
      notes,
    })

    return NextResponse.json({ call }, { status: 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
