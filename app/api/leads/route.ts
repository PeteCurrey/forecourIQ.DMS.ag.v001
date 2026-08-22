import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LeadService } from '@/lib/services/lead'
import { leadSchema } from '@/lib/validations'
import { toApiErrorResponse, toStatusCode } from '@/lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function authenticateApiKey(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey) {
    return { error: 'Missing x-api-key header', status: 401 }
  }

  const { data: dealership } = await supabase
    .from('dealerships')
    .select('id, name')
    .eq('api_key', apiKey)
    .single()

  if (!dealership) {
    return { error: 'Invalid API key', status: 401 }
  }

  return { dealership }
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validated = leadSchema.parse(body)

    const created = await LeadService.create(auth.dealership!.id, {
      ...validated,
      source: validated.source || 'website',
      notes: body.message ? `Customer Message: ${body.message}` : undefined,
    })

    return NextResponse.json({ success: true, lead_id: created.id }, { status: 201 })
  } catch (error: unknown) {
    const { body: errBody, status: errStatus } = toApiErrorResponse(error)
    return NextResponse.json(errBody, { status: errStatus })
  }
}
