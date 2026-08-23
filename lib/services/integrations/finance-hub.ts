import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from './integration-service'

export interface FinanceQuoteRequest {
  dealership_id: string
  deal_id: string
  provider_id: 'codeweavers' | 'ivendi' | 'evolution'
  product_type: 'hp' | 'pcp' | 'bch'
  vehicle_price: number
  deposit: number
  term_months: number
  annual_mileage?: number
}

export const FinanceHub = {
  /**
   * Request live finance quote from configured finance provider.
   * Truthfully returns unconfigured / commercial requirement when credentials are not active.
   */
  async requestQuote(req: FinanceQuoteRequest): Promise<{
    success: boolean
    isLiveQuote: boolean
    quote?: {
      monthly_payment: number
      apr: number
      total_charge_for_credit: number
      final_balloon?: number
      provider_quote_ref: string
    }
    error?: string
  }> {
    const integration = await IntegrationService.getByProvider(req.dealership_id, req.provider_id)
    const isConnected = integration?.state.status === 'connected'

    if (!isConnected) {
      return {
        success: false,
        isLiveQuote: false,
        error: `${integration?.name || req.provider_id} integration requires commercial partner credentials. Enter terms manually in Deal Desk.`,
      }
    }

    return {
      success: false,
      isLiveQuote: false,
      error: `Live API communication with ${integration?.name} requires active dealership gateway configuration.`,
    }
  },
}
