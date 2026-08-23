import { NextRequest, NextResponse } from 'next/server'
import { LeadIngestionService } from '@/lib/services/integrations/lead-ingestion'
import { toApiErrorResponse, ValidationError } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ provider: string }> }
) {
  try {
    const params = await props.params
    const provider = params.provider.toLowerCase()

    // Validate supported providers
    if (!['autotrader', 'motors', 'cargurus', 'ebay_motors', 'pistonheads', 'website'].includes(provider)) {
      throw new ValidationError(`Unsupported lead webhook provider: ${provider}`)
    }

    const body = await req.json()

    // Required fields: dealership_id, external_lead_id, first_name, last_name
    if (!body.dealership_id || !body.external_lead_id) {
      return NextResponse.json(
        { error: 'Missing required payload: dealership_id and external_lead_id are mandatory.' },
        { status: 400 }
      )
    }

    const result = await LeadIngestionService.ingestLead({
      dealership_id: body.dealership_id,
      provider_id: provider,
      external_lead_id: String(body.external_lead_id),
      first_name: body.first_name || body.customer_name?.split(' ')[0] || 'Enquiry',
      last_name: body.last_name || body.customer_name?.split(' ').slice(1).join(' ') || 'Customer',
      email: body.email,
      phone: body.phone,
      registration: body.registration,
      vehicle_id: body.vehicle_id,
      subject: body.subject,
      message: body.message,
      finance_interest: Boolean(body.finance_interest),
      part_exchange_interest: Boolean(body.part_exchange_interest),
      source_channel: body.source_channel || 'web',
      raw_payload: body,
    })

    return NextResponse.json(result, { status: result.isDuplicate ? 200 : 201 })
  } catch (err: unknown) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
