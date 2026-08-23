import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from '@/lib/services/integrations/integration-service'
import { requirePermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError, NotFoundError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ provider: string }> }
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

    const integration = await IntegrationService.getByProvider(profile.dealership_id, params.provider)
    if (!integration) throw new NotFoundError('Integration provider not found')

    // Fetch recent integration runs
    const { data: runs } = await supabase
      .from('integration_runs')
      .select('*')
      .eq('dealership_id', profile.dealership_id)
      .eq('provider_id', params.provider)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ integration, runs: runs || [] })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ provider: string }> }
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

    await requirePermission(profile.dealership_id, user.id, 'integrations.manage')

    const body = await req.json()
    const result = await IntegrationService.configure(
      profile.dealership_id,
      params.provider,
      user.id,
      body
    )

    return NextResponse.json({ success: true, integration: result })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ provider: string }> }
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

    await requirePermission(profile.dealership_id, user.id, 'integrations.manage')

    await IntegrationService.disconnect(profile.dealership_id, params.provider, user.id)

    return NextResponse.json({ success: true, message: 'Integration disconnected' })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
