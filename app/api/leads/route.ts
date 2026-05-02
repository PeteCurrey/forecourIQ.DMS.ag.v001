import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    
    // Basic validation
    if (!body.first_name || (!body.email && !body.phone)) {
      return NextResponse.json({ error: 'Missing required fields (first_name, and either email or phone)' }, { status: 400 })
    }

    const lead = {
      dealership_id: auth.dealership!.id,
      first_name: body.first_name,
      last_name: body.last_name || null,
      email: body.email || null,
      phone: body.phone || null,
      source: body.source || 'website',
      vehicle_id: body.vehicle_id || null,
      part_ex_reg: body.part_ex_reg || null,
      part_ex_mileage: body.part_ex_mileage || null,
      finance_interest: body.finance_interest || false,
      status: 'new',
      notes: body.message ? `Customer Message: ${body.message}` : null
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single()

    if (error) {
      console.error('Lead insertion error:', error)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    // Also log system activity
    await supabase.from('activities').insert({
      dealership_id: auth.dealership!.id,
      lead_id: data.id,
      vehicle_id: data.vehicle_id,
      type: 'system',
      content: `Lead captured via API (${lead.source})`
    })

    return NextResponse.json({ success: true, lead_id: data.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
