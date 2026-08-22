import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/services/ai'
import { LeadService } from '@/lib/services/lead'
import { toApiErrorResponse, AuthenticationError, ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthenticationError()

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id, full_name, dealerships(name, city, phone)')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      throw new ValidationError('No dealership associated with user.')
    }

    const body = await req.json()
    const { leadId, tone = 'professional' } = body

    if (!leadId) throw new ValidationError('leadId is required')

    const lead = await LeadService.getById(profile.dealership_id, leadId)
    const dealershipInfo = profile.dealerships as { name?: string; city?: string; phone?: string } | null
    const dealershipName = dealershipInfo?.name || 'Our Dealership'
    const salespersonName = profile.full_name || 'Sales Team'

    const vehicleContext = lead.vehicles ? {
      make: lead.vehicles.make,
      model: lead.vehicles.model,
      registration: lead.vehicles.registration,
      year: lead.vehicles.year,
      price: lead.vehicles.asking_price,
      status: lead.vehicles.status,
      isAvailable: ['available', 'ready_for_sale', 'advertised'].includes(lead.vehicles.status),
    } : null

    // System prompt with strict factual guardrails
    const systemPrompt = `You are IQ Draft Reply, an automotive sales communication assistant for UK motor dealership "${dealershipName}".
Your task is to draft an initial response from salesperson "${salespersonName}" to a prospective customer.

STRICT FACTUAL GUARDRAILS:
1. Address the customer by first name: "${lead.first_name}".
2. Reference the exact vehicle: ${vehicleContext ? `${vehicleContext.make} ${vehicleContext.model} (${vehicleContext.registration})` : 'their vehicle enquiry'}.
3. Fact check availability: ${vehicleContext?.isAvailable ? 'The vehicle is currently IN STOCK and available for viewing/test drive.' : 'The vehicle is currently in preparation / pending verification. Offer to check exact timeline.'}
4. DO NOT invent finance figures, monthly payments, discounts, opening hours, or warranty terms unless explicitly provided.
5. DO NOT promise specific delivery or collection dates.
6. Tone: ${tone.toUpperCase()}. Keep the message polite, focused, professional, and clear.
7. Include a clear call to action: invite them to schedule a viewing/test drive or answer any questions.
8. Sign off with:
Best regards,
${salespersonName}
${dealershipName}`

    const userPrompt = `Customer Name: ${lead.first_name} ${lead.last_name}
Customer Enquiry Message: "${lead.message || 'Customer enquired about vehicle availability and details.'}"
Vehicle: ${vehicleContext ? `${vehicleContext.year} ${vehicleContext.make} ${vehicleContext.model} (Reg: ${vehicleContext.registration}, Price: £${vehicleContext.price})` : 'General enquiry'}
Part Exchange Details: ${lead.part_ex_reg ? `Customer has Part-Ex (Reg: ${lead.part_ex_reg}, Mileage: ${lead.part_ex_mileage || 'unknown'})` : 'None specified'}
Finance Interest: ${lead.finance_interest ? 'Yes, customer is interested in finance' : 'Not specified'}

Draft a response email/message according to these facts.`

    const draftText = await AIService.draftReply(
      {
        dealershipId: profile.dealership_id,
        userId: user.id,
        capability: 'IQ_CREATE',
        purpose: 'lead_draft_reply',
        entityType: 'lead',
        entityId: lead.id,
      },
      systemPrompt,
      userPrompt
    )

    return NextResponse.json({
      draftReply: draftText,
      leadId: lead.id,
      tone,
      vehicle: vehicleContext,
    })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
