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
    .select('id, name, address_line1, city, county, postcode, phone, email, website_url, primary_colour, vat_number, fca_number')
    .eq('api_key', apiKey)
    .single()

  if (!dealership) {
    return { error: 'Invalid API key', status: 401 }
  }

  return { dealership }
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  return NextResponse.json({ data: auth.dealership })
}
