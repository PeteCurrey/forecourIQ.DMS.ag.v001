import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CustomerService } from '@/lib/services/customer'
import { toApiErrorResponse } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined

    const customers = await CustomerService.list(profile.dealership_id, search)
    return NextResponse.json(customers)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const body = await req.json()
    const customer = await CustomerService.create(profile.dealership_id, user.id, body)
    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
