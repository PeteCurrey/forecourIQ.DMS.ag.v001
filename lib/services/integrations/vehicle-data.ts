import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from './integration-service'
import { AuditService } from '@/lib/services/audit'

export interface VehicleDataResult {
  registration: string
  make?: string
  model?: string
  variant?: string
  year?: number
  colour?: string
  fuel_type?: string
  transmission?: string
  engine_capacity_cc?: number
  co2_emissions?: number
  mot_status?: string
  mot_expiry_date?: string
  tax_status?: string
  tax_due_date?: string
  wheelplan?: string
  revenue_weight?: number
  vin_last_six?: string
  provenance: 'dvla' | 'cap_hpi' | 'dealer_entered' | 'manual_fallback'
  provider_reference?: string
  retrieved_at: string
}

export interface VehicleValuationResult {
  vehicle_id: string
  provider: 'cap_hpi' | 'internal_calc'
  trade_value: number
  retail_value: number
  private_value?: number
  part_exchange_value?: number
  mileage?: number
  valuation_date: string
  provider_reference?: string
}

export const VehicleDataService = {
  /**
   * Look up vehicle identity and technical specification by registration.
   * Connects to genuine DVLA API when credentials exist; otherwise gracefully returns manual fallback state.
   */
  async lookupRegistration(
    dealershipId: string,
    registration: string,
    userId?: string
  ): Promise<{
    success: boolean
    data?: VehicleDataResult
    error?: string
    isManualFallback: boolean
  }> {
    const normalised = registration.toUpperCase().replace(/\s+/g, '')
    const startTime = Date.now()

    if (!normalised || normalised.length < 2 || normalised.length > 8) {
      return {
        success: false,
        error: 'Invalid UK registration format. Registrations must be 2 to 8 alphanumeric characters.',
        isManualFallback: false,
      }
    }

    const dvlaApiKey = process.env.DVLA_API_KEY

    // If no DVLA key configured, return explicit honest fallback
    if (!dvlaApiKey) {
      return {
        success: false,
        error:
          'DVLA Vehicle Enquiry Service integration is not configured. Vehicle details must be entered manually.',
        isManualFallback: true,
      }
    }

    try {
      const res = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
        method: 'POST',
        headers: {
          'x-api-key': dvlaApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: normalised }),
      })

      const durationMs = Date.now() - startTime

      if (!res.ok) {
        let errMessage = `DVLA lookup failed with status ${res.status}`
        if (res.status === 404) errMessage = `Vehicle registration ${normalised} not found in DVLA records.`
        if (res.status === 401 || res.status === 403) errMessage = 'DVLA API authentication rejected.'

        await IntegrationService.logRun({
          dealership_id: dealershipId,
          provider_id: 'dvla',
          operation: 'lookup_vehicle',
          status: 'failed',
          duration_ms: durationMs,
          error_message: errMessage,
          request_metadata: { registration: normalised },
        })

        return {
          success: false,
          error: errMessage,
          isManualFallback: true,
        }
      }

      const dvlaData = await res.json()

      // Normalize DVLA response
      const result: VehicleDataResult = {
        registration: dvlaData.registrationNumber || normalised,
        make: dvlaData.make,
        model: dvlaData.model || undefined,
        year: dvlaData.yearOfManufacture,
        colour: dvlaData.colour,
        fuel_type: dvlaData.fuelType ? dvlaData.fuelType.toLowerCase() : undefined,
        engine_capacity_cc: dvlaData.engineCapacity,
        co2_emissions: dvlaData.co2Emissions,
        mot_status: dvlaData.motStatus ? dvlaData.motStatus.toLowerCase() : undefined,
        mot_expiry_date: dvlaData.motExpiryDate,
        tax_status: dvlaData.taxStatus ? dvlaData.taxStatus.toLowerCase() : undefined,
        tax_due_date: dvlaData.taxDueDate,
        wheelplan: dvlaData.wheelplan,
        revenue_weight: dvlaData.revenueWeight,
        provenance: 'dvla',
        provider_reference: dvlaData.artEndDate || undefined,
        retrieved_at: new Date().toISOString(),
      }

      await IntegrationService.logRun({
        dealership_id: dealershipId,
        provider_id: 'dvla',
        operation: 'lookup_vehicle',
        status: 'success',
        duration_ms: durationMs,
        request_metadata: { registration: normalised },
        response_metadata: { make: result.make, year: result.year, mot_status: result.mot_status },
      })

      await IntegrationService.recordUsage(dealershipId, 'dvla', 'lookup_vehicle', 1)

      if (userId) {
        await AuditService.log({
          dealership_id: dealershipId,
          user_id: userId,
          action: 'vehicle.lookup_completed',
          entity_type: 'vehicle',
          after: { registration: normalised, make: result.make, provenance: 'dvla' },
          source: 'api',
        })
      }

      return {
        success: true,
        data: result,
        isManualFallback: false,
      }
    } catch (err: any) {
      return {
        success: false,
        error: `DVLA network error: ${err.message}`,
        isManualFallback: true,
      }
    }
  },

  /**
   * Fetch and store a vehicle valuation snapshot.
   */
  async recordValuation(
    dealershipId: string,
    vehicleId: string,
    valuation: {
      provider: string
      valuation_type?: 'acquisition' | 'part_exchange' | 'stock_review' | 'market'
      trade_value: number
      retail_value: number
      private_value?: number
      part_exchange_value?: number
      mileage?: number
      provider_reference?: string
      metadata?: Record<string, unknown>
    },
    userId?: string
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('vehicle_valuations').insert({
      dealership_id: dealershipId,
      vehicle_id: vehicleId,
      provider_id: valuation.provider || 'cap_hpi',
      valuation_type: valuation.valuation_type || 'market',
      trade_value: valuation.trade_value,
      retail_value: valuation.retail_value,
      private_value: valuation.private_value || null,
      part_exchange_value: valuation.part_exchange_value || null,
      mileage: valuation.mileage || null,
      provider_reference: valuation.provider_reference || null,
      metadata: valuation.metadata || {},
    })

    if (error) throw new Error(`VehicleDataService.recordValuation: ${error.message}`)

    if (userId) {
      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'valuation.retrieved',
        entity_type: 'vehicle',
        entity_id: vehicleId,
        after: { trade_value: valuation.trade_value, retail_value: valuation.retail_value },
        source: 'api',
      })
    }
  },

  /**
   * Get valuation history snapshots for a vehicle.
   */
  async getValuations(dealershipId: string, vehicleId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicle_valuations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .order('valuation_date', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  },
}
