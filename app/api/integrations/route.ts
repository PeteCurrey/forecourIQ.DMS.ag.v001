import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from '@/lib/services/integrations/integration-service'
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

    const integrations = await IntegrationService.listForDealership(profile.dealership_id)
    return NextResponse.json({ integrations })
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

    await requirePermission(profile.dealership_id, user.id, 'integrations.manage')

    const body = await req.json()
    if (!body.provider_id) throw new ValidationError('provider_id is required')

    const result = await IntegrationService.configure(
      profile.dealership_id,
      body.provider_id,
      user.id,
      {
        settings: body.settings,
        metadata: body.metadata,
        status: body.status,
      }
    )

    return NextResponse.json({ success: true, integration: result })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
