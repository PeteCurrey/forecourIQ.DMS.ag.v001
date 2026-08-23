import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AdvertisingService } from '@/lib/services/integrations/advertising'
import { requirePermission } from '@/lib/rbac/permissions'
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

    await requirePermission(profile.dealership_id, user.id, 'advertising.read')

    const url = new URL(req.url)
    const vehicleId = url.searchParams.get('vehicle_id') || undefined
    const providerId = url.searchParams.get('provider_id') || undefined
    const status = url.searchParams.get('status') || undefined

    const listings = await AdvertisingService.listListings(profile.dealership_id, {
      vehicle_id: vehicleId,
      provider_id: providerId,
      status,
    })

    return NextResponse.json({ listings })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
