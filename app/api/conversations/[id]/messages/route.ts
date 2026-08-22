import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConversationService } from '@/lib/services/conversation'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const conversation = await ConversationService.getById(profile.dealership_id, id)
    return NextResponse.json({ conversation })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) throw new ValidationError('Dealership required')

    const body = await req.json()
    const { direction = 'outbound', channel = 'web', body: messageBody, recipient, subject, leadId, customerId } = body

    if (!messageBody || !messageBody.trim()) {
      throw new ValidationError('Message content is required')
    }

    const message = await ConversationService.sendMessage(profile.dealership_id, id, {
      direction,
      channel,
      body: messageBody,
      userId: user.id,
      userName: profile.full_name,
      recipient,
      subject,
      leadId,
      customerId,
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
