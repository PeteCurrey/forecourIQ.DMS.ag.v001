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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select('id, registration, make, model, variant, year, mileage, colour, fuel_type, transmission, body_type, doors, engine_size, mot_expiry, condition, asking_price, status, description, highlights, photos, primary_photo_index, created_at, updated_at')
    .eq('id', params.id)
    .eq('dealership_id', auth.dealership!.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}
