import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AdvertisingService } from '@/lib/services/integrations/advertising'
import { requirePermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

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

    await requirePermission(profile.dealership_id, user.id, 'advertising.publish')

    const body = await req.json()
    if (!body.vehicle_id) throw new ValidationError('vehicle_id is required')
    if (!body.provider_id) throw new ValidationError('provider_id is required')

    const result = await AdvertisingService.publish(
      profile.dealership_id,
      body.vehicle_id,
      body.provider_id,
      user.id
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
