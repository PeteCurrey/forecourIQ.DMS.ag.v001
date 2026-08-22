import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PreparationService } from '@/lib/services/preparation'
import { toApiErrorResponse } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const vehicleId = searchParams.get('vehicleId') || undefined
    const category = searchParams.get('category') || undefined

    const jobs = await PreparationService.list(profile.dealership_id, { status, vehicleId, category })
    return NextResponse.json(jobs)
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
    const job = await PreparationService.create(profile.dealership_id, user.id, body)
    return NextResponse.json(job, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const body = await req.json()
    const { jobId, ...updates } = body
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

    const updated = await PreparationService.update(profile.dealership_id, user.id, jobId, updates)
    return NextResponse.json(updated)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
