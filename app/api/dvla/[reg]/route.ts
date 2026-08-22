import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DVLA Vehicle Enquiry Service API
 *
 * STATUS: NOT_YET_IMPLEMENTED
 *
 * A real implementation requires a commercial agreement with DVLA or an
 * approved data provider (e.g., CAP HPI, Cazana) and API credentials.
 *
 * Configure DVLA_API_KEY in .env.local when credentials are available.
 * The integration framework in lib/integrations/registry.ts tracks this status.
 *
 * DO NOT return fabricated vehicle data from this endpoint.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reg: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { reg } = await params
  const normalised = reg.toUpperCase().replace(/\s+/g, '')

  // Validate basic UK registration format
  if (!normalised || normalised.length < 2 || normalised.length > 8) {
    return NextResponse.json(
      { error: 'Invalid registration format.' },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      status: 'NOT_YET_IMPLEMENTED',
      registration: normalised,
      message:
        'DVLA vehicle lookup requires a commercial data agreement. ' +
        'Vehicle details must be entered manually until this integration is configured. ' +
        'Contact ForecourIQ support to enable automatic vehicle data lookup.',
      integration: 'dvla',
    },
    { status: 503 }
  )
}
