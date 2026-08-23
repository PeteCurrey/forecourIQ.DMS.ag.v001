import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DealService } from '@/lib/services/deal'
import { hasPermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError, NotFoundError } from '@/lib/errors'

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

    const deal = await DealService.getById(profile.dealership_id, params.id)
    if (!deal) throw new NotFoundError('Deal not found')

    const canReadMargin = await hasPermission(profile.dealership_id, user.id, 'margin.read')

    let safeDeal = deal
    if (!canReadMargin) {
      const { gross_margin_projected, gross_margin_actual, vehicles, ...rest } = deal
      const safeVehicle = vehicles
        ? {
            ...vehicles,
            purchase_price: undefined,
            auction_fee: undefined,
            transport_cost: undefined,
            prep_cost: undefined,
            other_acquisition_costs: undefined,
          }
        : vehicles
      safeDeal = {
        ...rest,
        vehicles: safeVehicle,
      } as any
    }

    return NextResponse.json({ deal: safeDeal, can_read_margin: canReadMargin })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(
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

    // If updating status
    if (body.status) {
      await DealService.updateStatus(
        profile.dealership_id,
        params.id,
        user.id,
        body.status,
        body.reason
      )
    }

    // If updating discount
    if (body.discount_amount !== undefined) {
      const canApprove = await hasPermission(profile.dealership_id, user.id, 'deals.approve_discount')
      await DealService.applyDiscount(
        profile.dealership_id,
        params.id,
        user.id,
        Number(body.discount_amount),
        body.discount_reason || 'Manual discount applied',
        canApprove ? user.id : undefined
      )
    }

    // Generic field update
    const { status, reason, discount_amount, discount_reason, ...otherUpdates } = body
    if (Object.keys(otherUpdates).length > 0) {
      await DealService.update(profile.dealership_id, params.id, user.id, otherUpdates)
    }

    const updatedDeal = await DealService.getById(profile.dealership_id, params.id)
    return NextResponse.json({ success: true, deal: updatedDeal })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
