import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DealService } from '@/lib/services/deal'
import { hasPermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError, ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const url = new URL(req.url)
    const statusParam = url.searchParams.get('status')
    const salespersonId = url.searchParams.get('salesperson_id') || undefined
    const customerId = url.searchParams.get('customer_id') || undefined
    const vehicleId = url.searchParams.get('vehicle_id') || undefined
    const kpisOnly = url.searchParams.get('kpis') === 'true'

    if (kpisOnly) {
      const kpis = await DealService.getKPIs(profile.dealership_id)
      return NextResponse.json({ kpis })
    }

    const statuses = statusParam ? (statusParam.includes(',') ? statusParam.split(',') : statusParam) as any : undefined

    const deals = await DealService.list(profile.dealership_id, {
      status: statuses,
      salesperson_id: salespersonId,
      customer_id: customerId,
      vehicle_id: vehicleId,
    })

    // Check if user has margin.read permission
    const canReadMargin = await hasPermission(profile.dealership_id, user.id, 'margin.read')

    // If no margin.read permission, strip gross margins & vehicle costs
    const safeDeals = canReadMargin
      ? deals
      : deals.map((d) => {
          const { gross_margin_projected, gross_margin_actual, vehicles, ...rest } = d
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
          return {
            ...rest,
            vehicles: safeVehicle,
          }
        })

    return NextResponse.json({ deals: safeDeals })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
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

    let deal
    if (body.lead_id && body.from_lead) {
      deal = await DealService.createFromLead(profile.dealership_id, body.lead_id, user.id)
    } else {
      deal = await DealService.create(profile.dealership_id, user.id, {
        customer_id: body.customer_id,
        vehicle_id: body.vehicle_id,
        lead_id: body.lead_id,
        salesperson_id: body.salesperson_id || user.id,
        location_id: body.location_id,
        payment_method: body.payment_method || 'cash',
        vehicle_retail_price: body.vehicle_retail_price,
        agreed_vehicle_price: body.agreed_vehicle_price,
        deposit_required: body.deposit_required,
        finance_amount: body.finance_amount,
        notes: body.notes,
      })
    }

    return NextResponse.json({ success: true, deal, deal_id: deal.id }, { status: 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
