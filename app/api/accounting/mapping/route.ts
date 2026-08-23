import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AccountingService } from '@/lib/services/integrations/accounting'
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

    const url = new URL(req.url)
    const providerId = url.searchParams.get('provider_id') || 'xero'

    const mapping = await AccountingService.getMapping(profile.dealership_id, providerId)
    const logs = await AccountingService.getSyncLogs(profile.dealership_id)

    return NextResponse.json({ mapping, logs })
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

    await requirePermission(profile.dealership_id, user.id, 'accounting.manage')

    const body = await req.json()
    const result = await AccountingService.saveMapping(
      profile.dealership_id,
      user.id,
      body
    )

    return NextResponse.json({ success: true, mapping: result })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
