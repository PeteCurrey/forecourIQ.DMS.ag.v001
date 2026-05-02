import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to query securely based on API key
)

// Helper to authenticate via API Key
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

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'available'
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 48)
  const offset = parseInt(searchParams.get('offset') || '0')
  const make = searchParams.get('make')
  const fuelType = searchParams.get('fuel_type')
  const bodyType = searchParams.get('body_type')
  const minPrice = searchParams.get('min_price')
  const maxPrice = searchParams.get('max_price')

  let query = supabase
    .from('vehicles')
    .select('id, registration, make, model, variant, year, mileage, colour, fuel_type, transmission, body_type, doors, engine_size, mot_expiry, condition, asking_price, status, description, highlights, photos, primary_photo_index, created_at, updated_at', { count: 'exact' })
    .eq('dealership_id', auth.dealership!.id)
    .eq('status', status)

  // Apply filters
  if (make) query = query.ilike('make', `%${make}%`)
  if (fuelType) query = query.ilike('fuel_type', `%${fuelType}%`)
  if (bodyType) query = query.ilike('body_type', `%${bodyType}%`)
  if (minPrice) query = query.gte('asking_price', minPrice)
  if (maxPrice) query = query.lte('asking_price', maxPrice)

  // Pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count,
    limit,
    offset
  })
}
