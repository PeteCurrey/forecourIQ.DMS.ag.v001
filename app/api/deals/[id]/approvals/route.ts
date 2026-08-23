import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
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

    const { data: approvals, error } = await supabase
      .from('deal_approvals')
      .select('*, requested_by:profiles!deal_approvals_requested_by_fkey(id, full_name), approver:profiles!deal_approvals_approver_id_fkey(id, full_name)')
      .eq('dealership_id', profile.dealership_id)
      .eq('deal_id', params.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ approvals: approvals || [] })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
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
    const { data: approval, error } = await supabase
      .from('deal_approvals')
      .insert({
        dealership_id: profile.dealership_id,
        deal_id: params.id,
        type: body.type || 'discount',
        requested_by: user.id,
        amount: Number(body.amount || 0),
        reason: body.reason || null,
        notes: body.notes || null,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'discount.requested',
      entity_type: 'deal_approval',
      entity_id: approval.id,
      after: { deal_id: params.id, amount: body.amount, type: body.type },
      source: 'web',
    })

    return NextResponse.json({ success: true, approval }, { status: 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
