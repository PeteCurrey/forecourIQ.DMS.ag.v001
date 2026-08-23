import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FinanceService } from '@/lib/services/finance'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; fid: string }> }
) {
  try {
    const params = await props.params
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
    if (!body.status) throw new ValidationError('status is required')

    const updated = await FinanceService.updateStatus(
      profile.dealership_id,
      params.fid,
      user.id,
      body.status,
      body.notes
    )

    return NextResponse.json({ success: true, finance_proposal: updated })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
