import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentService } from '@/lib/services/payment'
import { requirePermission } from '@/lib/rbac/permissions'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
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

    await requirePermission(profile.dealership_id, user.id, 'payments.record')

    const body = await req.json()
    if (!body.deal_id) throw new ValidationError('deal_id is required')
    const amount = Number(body.amount)
    if (!amount || amount <= 0) throw new ValidationError('Valid deposit amount is required')

    const result = await PaymentService.createStripeDepositCheckout(
      profile.dealership_id,
      body.deal_id,
      user.id,
      amount,
      body.category || 'sales_deposit'
    )

    return NextResponse.json({ success: true, url: result.url, payment_intent_id: result.paymentIntentId })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
