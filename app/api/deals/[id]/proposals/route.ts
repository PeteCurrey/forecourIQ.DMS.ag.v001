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

    const { data: proposals, error } = await supabase
      .from('deal_proposals')
      .select('*, created_by:profiles!deal_proposals_created_by_fkey(id, full_name)')
      .eq('dealership_id', profile.dealership_id)
      .eq('deal_id', params.id)
      .order('version', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ proposals: proposals || [] })
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

    // Determine next version number
    const { data: latest } = await supabase
      .from('deal_proposals')
      .select('version')
      .eq('deal_id', params.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (latest?.version || 0) + 1

    // If there were previous proposals, mark them superseded
    if (nextVersion > 1) {
      await supabase
        .from('deal_proposals')
        .update({ status: 'superseded' })
        .eq('deal_id', params.id)
        .in('status', ['draft', 'presented'])
    }

    const { data: proposal, error } = await supabase
      .from('deal_proposals')
      .insert({
        dealership_id: profile.dealership_id,
        deal_id: params.id,
        version: nextVersion,
        status: body.status || 'draft',
        vehicle_retail_price: Number(body.vehicle_retail_price || 0),
        vehicle_selling_price: Number(body.vehicle_selling_price || 0),
        discount_amount: Number(body.discount_amount || 0),
        products_total: Number(body.products_total || 0),
        customer_purchase_total: Number(body.customer_purchase_total || 0),
        px_allowance: Number(body.px_allowance || 0),
        px_settlement: Number(body.px_settlement || 0),
        px_equity: Number(body.px_equity || 0),
        deposit: Number(body.deposit || 0),
        finance_amount: Number(body.finance_amount || 0),
        balance_to_fund: Number(body.balance_to_fund || 0),
        notes: body.notes || null,
        created_by: user.id,
        presented_at: body.status === 'presented' ? new Date().toISOString() : null,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    await AuditService.log({
      dealership_id: profile.dealership_id,
      user_id: user.id,
      action: 'proposal.created',
      entity_type: 'deal_proposal',
      entity_id: proposal.id,
      after: { deal_id: params.id, version: nextVersion },
      source: 'web',
    })

    return NextResponse.json({ success: true, proposal }, { status: 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
