import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConversationService } from '@/lib/services/conversation'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const url = new URL(req.url)
    const channel = url.searchParams.get('channel') || undefined
    const unreadOnly = url.searchParams.get('unread') === 'true'
    const assignedUserId = url.searchParams.get('assignedTo') || undefined

    const conversations = await ConversationService.list(profile.dealership_id, {
      channel,
      unreadOnly,
      assignedUserId,
    })

    return NextResponse.json({ conversations })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
