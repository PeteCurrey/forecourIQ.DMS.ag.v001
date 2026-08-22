import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/services/ai'
import { toApiErrorResponse } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const body = await req.json()
    const { vehicleId, spec } = body

    if (!spec?.make || !spec?.model) {
      return NextResponse.json({ error: 'Vehicle make and model are required.' }, { status: 400 })
    }

    const description = await AIService.generateVehicleDescription(
      {
        dealershipId: profile.dealership_id,
        userId: user.id,
        capability: 'IQ_CREATE',
        purpose: 'vehicle_advert_description',
        entityType: 'vehicle',
        entityId: vehicleId,
      },
      spec
    )

    return NextResponse.json({ description })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
