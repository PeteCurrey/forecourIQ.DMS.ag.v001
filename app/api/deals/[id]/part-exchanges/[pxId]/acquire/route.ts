import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PartExchangeService } from '@/lib/services/part-exchange'
import { requirePermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; pxId: string }> }
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

    await requirePermission(profile.dealership_id, user.id, 'part_exchange.manage')

    const vehicleId = await PartExchangeService.acquireToStock(profile.dealership_id, params.pxId, user.id)

    return NextResponse.json({
      success: true,
      message: 'Part exchange successfully converted and acquired into stock',
      vehicle_id: vehicleId,
    })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
