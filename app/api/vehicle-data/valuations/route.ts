import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VehicleDataService } from '@/lib/services/integrations/vehicle-data'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

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
    const vehicleId = url.searchParams.get('vehicle_id')
    if (!vehicleId) throw new ValidationError('vehicle_id is required')

    const valuations = await VehicleDataService.getValuations(profile.dealership_id, vehicleId)
    return NextResponse.json({ valuations })
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
    if (!body.vehicle_id) throw new ValidationError('vehicle_id is required')
    if (body.trade_value === undefined || body.retail_value === undefined) {
      throw new ValidationError('trade_value and retail_value are required')
    }

    await VehicleDataService.recordValuation(
      profile.dealership_id,
      body.vehicle_id,
      body,
      user.id
    )

    return NextResponse.json({ success: true, message: 'Valuation snapshot recorded.' })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
