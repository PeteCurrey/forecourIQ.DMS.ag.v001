import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { LeadService } from '@/lib/services/lead'
import { leadSchema } from '@/lib/validations'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || undefined
    const search = url.searchParams.get('search') || undefined
    const source = url.searchParams.get('source') || undefined
    const assignedTo = url.searchParams.get('assignedTo') || undefined
    const followUpQueue = (url.searchParams.get('followUp') as any) || undefined

    const leads = await LeadService.list(profile.dealership_id, {
      status,
      search,
      source,
      assignedTo,
      followUpQueue,
    })

    return NextResponse.json({ leads })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    let dealershipId: string | null = null
    let userId: string | undefined

    if (apiKey) {
      // Authenticate with API key for public dealer website / portal webhooks
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: dealership } = await serviceSupabase
        .from('dealerships')
        .select('id')
        .eq('api_key', apiKey)
        .single()

      if (!dealership) throw new AuthenticationError('Invalid x-api-key')
      dealershipId = dealership.id
    } else {
      // Authenticate with user session for internal DMS lead creation
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AuthenticationError()

      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single()

      if (!profile?.dealership_id) throw new ValidationError('No dealership associated with user')
      dealershipId = profile.dealership_id
      userId = user.id
    }

    const body = await req.json()
    const validated = leadSchema.parse(body)

    if (!dealershipId) throw new ValidationError('Dealership ID required')

    const created = await LeadService.create(dealershipId, {
      ...validated,
      source: validated.source || 'website',
      channel: body.channel || 'web',
      temperature: body.temperature || 'unknown',
      priority: body.priority || 'normal',
      subject: body.subject || 'Vehicle Enquiry',
      message: body.message || null,
      next_action_at: body.next_action_at || null,
      next_action_description: body.next_action_description || null,
    }, userId)

    return NextResponse.json({ success: true, lead: created, lead_id: created.id }, { status: 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
