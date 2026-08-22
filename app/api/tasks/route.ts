import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TaskService } from '@/lib/services/task'
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
    const assignedTo = searchParams.get('assignedTo') || undefined
    const entityType = searchParams.get('entityType') || undefined
    const entityId = searchParams.get('entityId') || undefined

    const tasks = await TaskService.list(profile.dealership_id, { status, assignedTo, entityType, entityId })
    return NextResponse.json(tasks)
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
    const task = await TaskService.create(profile.dealership_id, user.id, body)
    return NextResponse.json(task, { status: 201 })
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
    const { taskId, status } = body
    if (!taskId || !status) return NextResponse.json({ error: 'taskId and status required' }, { status: 400 })

    const updated = await TaskService.updateStatus(profile.dealership_id, user.id, taskId, status)
    return NextResponse.json(updated)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
