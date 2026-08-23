import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import { requirePermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; aId: string }> }
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

    await requirePermission(profile.dealership_id, user.id, 'deals.approve_discount')

    const body = await req.json()
    const status = body.status as 'approved' | 'rejected' | 'cancelled'
    if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
      throw new ValidationError('Valid approval status is required')
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      status,
      approver_id: user.id,
      notes: body.notes || null,
      updated_at: now,
    }
    if (status === 'approved') updatePayload.approved_at = now
    if (status === 'rejected') updatePayload.rejected_at = now

    const { data: approval, error } = await supabase
      .from('deal_approvals')
      .update(updatePayload)
      .eq('dealership_id', profile.dealership_id)
      .eq('id', params.aId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: status === 'approved' ? 'discount.approved' : 'discount.rejected',
      entity_type: 'deal_approval',
      entity_id: params.aId,
      after: { status, deal_id: params.id },
      source: 'web',
    })

    return NextResponse.json({ success: true, approval })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
