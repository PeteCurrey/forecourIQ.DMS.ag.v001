import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VehicleDataService } from '@/lib/services/integrations/vehicle-data'
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

    const body = await req.json()
    if (!body.registration) throw new ValidationError('registration is required')

    const result = await VehicleDataService.lookupRegistration(
      profile.dealership_id,
      body.registration,
      user.id
    )

    return NextResponse.json(result, { status: result.success ? 200 : result.isManualFallback ? 200 : 400 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
