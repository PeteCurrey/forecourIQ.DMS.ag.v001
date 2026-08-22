import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentService } from '@/lib/services/appointment'
import { toApiErrorResponse } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || undefined
    const status = searchParams.get('status') || undefined
    const assignedTo = searchParams.get('assignedTo') || undefined

    const appointments = await AppointmentService.list(profile.dealership_id, { date, status, assignedTo })
    return NextResponse.json(appointments)
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
    const appt = await AppointmentService.create(profile.dealership_id, user.id, body)
    return NextResponse.json(appt, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
