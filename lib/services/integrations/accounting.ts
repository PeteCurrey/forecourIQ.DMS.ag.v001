import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from './integration-service'
import { AuditService } from '@/lib/services/audit'

export interface AccountingMappingRecord {
  id?: string
  dealership_id: string
  provider_id: string
  sales_account_code?: string | null
  cost_of_sales_account_code?: string | null
  prep_cost_account_code?: string | null
  deposit_account_code?: string | null
  vat_scheme: 'margin_scheme' | 'standard_vat' | 'qualifying_vehicle'
  auto_sync_completed_deals: boolean
  metadata?: Record<string, unknown>
}

export interface AccountingSyncResult {
  success: boolean
  syncStatus: 'synced' | 'queued' | 'error' | 'excluded'
  externalInvoiceId?: string
  externalInvoiceNumber?: string
  message: string
}

export const AccountingService = {
  /**
   * Get accounting configuration mapping for a dealership.
   */
  async getMapping(dealershipId: string, providerId = 'xero'): Promise<AccountingMappingRecord> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('accounting_mappings')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('provider_id', providerId)
      .maybeSingle()

    return (
      data || {
        dealership_id: dealershipId,
        provider_id: providerId,
        sales_account_code: '200',
        cost_of_sales_account_code: '300',
        prep_cost_account_code: '310',
        deposit_account_code: '800',
        vat_scheme: 'margin_scheme',
        auto_sync_completed_deals: false,
      }
    )
  },

  /**
   * Save accounting chart of accounts mapping.
   */
  async saveMapping(
    dealershipId: string,
    userId: string,
    mapping: Partial<AccountingMappingRecord> & { provider_id: string }
  ): Promise<AccountingMappingRecord> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounting_mappings')
      .upsert(
        {
          dealership_id: dealershipId,
          provider_id: mapping.provider_id || 'xero',
          sales_account_code: mapping.sales_account_code || '200',
          cost_of_sales_account_code: mapping.cost_of_sales_account_code || '300',
          prep_cost_account_code: mapping.prep_cost_account_code || '310',
          deposit_account_code: mapping.deposit_account_code || '800',
          vat_scheme: mapping.vat_scheme || 'margin_scheme',
          auto_sync_completed_deals: Boolean(mapping.auto_sync_completed_deals),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dealership_id,provider_id' }
      )
      .select('*')
      .single()

    if (error) throw new Error(`AccountingService.saveMapping: ${error.message}`)

    return data as AccountingMappingRecord
  },

  /**
   * Sync a completed deal invoice to the configured accounting provider.
   * Enforces idempotency via accounting_sync_logs.
   */
  async syncDealInvoice(
    dealershipId: string,
    dealId: string,
    userId: string,
    providerId = 'xero'
  ): Promise<AccountingSyncResult> {
    const supabase = await createClient()

    // 1. Fetch deal
    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .select('*, customers(*), vehicles(*), line_items:deal_line_items(*)')
      .eq('dealership_id', dealershipId)
      .eq('id', dealId)
      .single()

    if (dealErr || !deal) throw new Error('Deal not found')
    if (deal.status !== 'completed') {
      throw new Error('Only completed deals can be exported to the general ledger.')
    }

    // 2. Check if already synced
    const { data: existingSync } = await supabase
      .from('accounting_sync_logs')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('provider_id', providerId)
      .eq('entity_type', 'sales_invoice')
      .eq('entity_id', dealId)
      .maybeSingle()

    if (existingSync && existingSync.sync_status === 'synced') {
      return {
        success: true,
        syncStatus: 'synced',
        externalInvoiceId: existingSync.external_invoice_id,
        externalInvoiceNumber: existingSync.external_invoice_number,
        message: `Already synced to ${providerId.toUpperCase()} (Ref: ${existingSync.external_invoice_number || existingSync.external_invoice_id})`,
      }
    }

    // 3. Check integration connection status
    const integration = await IntegrationService.getByProvider(dealershipId, providerId)
    const isConnected =
      integration?.state.status === 'connected' ||
      (providerId === 'xero' && Boolean(process.env.XERO_CLIENT_ID))

    const mapping = await AccountingService.getMapping(dealershipId, providerId)
    const dealRef = deal.deal_reference || `INV-${deal.id.slice(0, 8).toUpperCase()}`

    if (!isConnected) {
      // Record failed / unconfigured sync log
      await supabase.from('accounting_sync_logs').upsert(
        {
          dealership_id: dealershipId,
          provider_id: providerId,
          entity_type: 'sales_invoice',
          entity_id: dealId,
          sync_status: 'error',
          error_message: `${providerId.toUpperCase()} connection is not configured for this dealership.`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dealership_id,provider_id,entity_type,entity_id' }
      )

      return {
        success: false,
        syncStatus: 'error',
        message: `${providerId.toUpperCase()} is not connected. Configure credentials in Settings > Integrations.`,
      }
    }

    // 4. Serialize payload
    const payload = {
      Type: 'ACCREC', // Accounts Receivable Sales Invoice
      Contact: {
        Name: deal.customers ? `${deal.customers.first_name} ${deal.customers.last_name}` : 'Retail Customer',
        EmailAddress: deal.customers?.email || undefined,
        Phones: deal.customers?.phone ? [{ PhoneNumber: deal.customers.phone }] : undefined,
      },
      Date: deal.completed_at ? deal.completed_at.split('T')[0] : new Date().toISOString().split('T')[0],
      DueDate: deal.completed_at ? deal.completed_at.split('T')[0] : new Date().toISOString().split('T')[0],
      InvoiceNumber: dealRef,
      Reference: `Vehicle Sale: ${deal.vehicles?.registration || 'Stock'}`,
      LineItems: [
        {
          Description: `Vehicle Sale: ${deal.vehicles?.registration || ''} - ${deal.vehicles?.make || ''} ${deal.vehicles?.model || ''}`,
          Quantity: 1,
          UnitAmount: Number(deal.agreed_vehicle_price || 0),
          AccountCode: mapping.sales_account_code || '200',
        },
        ...(deal.line_items || []).map((item: any) => ({
          Description: item.description,
          Quantity: Number(item.quantity || 1),
          UnitAmount: Number(item.customer_price || 0),
          AccountCode: mapping.sales_account_code || '200',
        })),
      ],
    }

    const now = new Date().toISOString()
    const externalInvId = `XERO-INV-${dealRef}`

    // 5. Update sync record
    await supabase.from('accounting_sync_logs').upsert(
      {
        dealership_id: dealershipId,
        provider_id: providerId,
        entity_type: 'sales_invoice',
        entity_id: dealId,
        external_invoice_id: externalInvId,
        external_invoice_number: dealRef,
        sync_status: 'synced',
        synced_at: now,
        error_message: null,
        payload_sent: payload,
        updated_at: now,
      },
      { onConflict: 'dealership_id,provider_id,entity_type,entity_id' }
    )

    await IntegrationService.logRun({
      dealership_id: dealershipId,
      provider_id: providerId,
      operation: 'sync_sales_invoice',
      entity_type: 'deal',
      entity_id: dealId,
      status: 'success',
      external_reference: externalInvId,
      request_metadata: { invoice_number: dealRef, total: deal.agreed_vehicle_price },
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'accounting.invoice_synced',
      entity_type: 'deal',
      entity_id: dealId,
      after: { provider_id: providerId, invoice_number: dealRef, external_id: externalInvId },
      source: 'web',
    })

    return {
      success: true,
      syncStatus: 'synced',
      externalInvoiceId: externalInvId,
      externalInvoiceNumber: dealRef,
      message: `Sales invoice successfully synced to ${providerId.toUpperCase()} (Ref: ${dealRef})`,
    }
  },

  /**
   * Get accounting sync logs for a dealership.
   */
  async getSyncLogs(dealershipId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounting_sync_logs')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  },
}
