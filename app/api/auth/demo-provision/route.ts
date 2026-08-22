import { NextResponse } from 'next/server'

/**
 * Demo provisioning endpoint — DISABLED IN PRODUCTION
 *
 * This endpoint previously allowed unauthenticated creation of demo users
 * via the Supabase service role. It has been disabled as a Phase 0 security
 * remediation. Demo users must be created directly in Supabase Auth console
 * or via a properly authenticated admin panel in a future phase.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been disabled.',
      reason: 'Public service-role provisioning is not permitted in production.',
    },
    { status: 403 }
  )
}
