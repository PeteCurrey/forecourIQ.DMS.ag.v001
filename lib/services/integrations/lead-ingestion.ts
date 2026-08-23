import { createClient } from '@/lib/supabase/server'
import { LeadService } from '@/lib/services/lead'
import { IntegrationService } from './integration-service'
import { AuditService } from '@/lib/services/audit'

export interface PortalLeadPayload {
  dealership_id: string
  provider_id: string
  external_lead_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  registration?: string
  vehicle_id?: string
  subject?: string
  message?: string
  finance_interest?: boolean
  part_exchange_interest?: boolean
  source_channel?: string
  raw_payload?: Record<string, unknown>
}

export const LeadIngestionService = {
  /**
   * Ingest external portal enquiry with strict idempotency.
   * Prevents duplicate leads when portals retry webhooks.
   */
  async ingestLead(payload: PortalLeadPayload): Promise<{
    success: boolean
    isDuplicate: boolean
    leadId?: string
    message: string
  }> {
    const supabase = await createClient()

    // 1. Idempotency Check: check if lead with same external_reference / provider already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('dealership_id', payload.dealership_id)
      .eq('metadata->>external_lead_id', payload.external_lead_id)
      .eq('metadata->>provider_id', payload.provider_id)
      .maybeSingle()

    if (existingLead) {
      await IntegrationService.logRun({
        dealership_id: payload.dealership_id,
        provider_id: payload.provider_id,
        operation: 'ingest_portal_lead',
        status: 'skipped',
        external_reference: payload.external_lead_id,
        response_metadata: { reason: 'duplicate_external_lead_id', existing_lead_id: existingLead.id },
      })

      return {
        success: true,
        isDuplicate: true,
        leadId: existingLead.id,
        message: 'Enquiry already ingested previously (duplicate webhook received).',
      }
    }

    // 2. Resolve Vehicle ID if registration supplied
    let targetVehicleId = payload.vehicle_id
    if (!targetVehicleId && payload.registration) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('dealership_id', payload.dealership_id)
        .eq('registration', payload.registration.toUpperCase().replace(/\s+/g, ''))
        .maybeSingle()

      if (vehicle) targetVehicleId = vehicle.id
    }

    // 3. Create canonical CRM Lead
    const createdLead = await LeadService.create(
      payload.dealership_id,
      {
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        vehicle_id: targetVehicleId,
        source: (payload.provider_id === 'autotrader' ? 'autotrader' : payload.provider_id === 'motors' ? 'motors' : 'portal') as any,
        channel: payload.source_channel || 'web',
        temperature: 'warm',
        priority: 'high',
        subject: payload.subject || `Vehicle Enquiry: ${payload.registration || 'Stock'}`,
        message: payload.message || null,
        finance_interest: payload.finance_interest,
        part_exchange_interest: payload.part_exchange_interest,
      } as any
    )

    // 4. Update lead metadata with external reference
    await supabase
      .from('leads')
      .update({
        metadata: {
          provider_id: payload.provider_id,
          external_lead_id: payload.external_lead_id,
          raw_payload: payload.raw_payload || {},
        },
      })
      .eq('id', createdLead.id)

    // 5. Log integration operation
    await IntegrationService.logRun({
      dealership_id: payload.dealership_id,
      provider_id: payload.provider_id,
      operation: 'ingest_portal_lead',
      entity_type: 'lead',
      entity_id: createdLead.id,
      status: 'success',
      external_reference: payload.external_lead_id,
      request_metadata: {
        customer: `${payload.first_name} ${payload.last_name}`,
        registration: payload.registration,
      },
    })

    await IntegrationService.recordUsage(payload.dealership_id, payload.provider_id, 'lead_ingestion', 1)

    return {
      success: true,
      isDuplicate: false,
      leadId: createdLead.id,
      message: `Enquiry from ${payload.provider_id.toUpperCase()} successfully ingested into CRM.`,
    }
  },
}
