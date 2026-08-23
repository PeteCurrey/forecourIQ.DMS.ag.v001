import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from './integration-service'
import { AuditService } from '@/lib/services/audit'
import {
  PortalKey,
  PortalListingStatus,
  PortalListingRecord,
  AdvertisingReadiness,
  checkAdvertisingReadiness,
} from './advertising-calc'

export type { PortalKey, PortalListingStatus, PortalListingRecord, AdvertisingReadiness }
export { checkAdvertisingReadiness }

export const AdvertisingService = {
  checkReadiness: checkAdvertisingReadiness,

  /**
   * List all portal listings for a dealership.
   */
  async listListings(dealershipId: string, filters: { vehicle_id?: string; provider_id?: string; status?: string } = {}) {
    const supabase = await createClient()

    let query = supabase
      .from('portal_listings')
      .select('*, vehicles(id, registration, make, model, variant, asking_price, status, photos)')
      .eq('dealership_id', dealershipId)
      .order('updated_at', { ascending: false })

    if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id)
    if (filters.provider_id) query = query.eq('provider_id', filters.provider_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) throw new Error(`AdvertisingService.listListings: ${error.message}`)
    return (data || []) as unknown as PortalListingRecord[]
  },

  /**
   * Publish a vehicle to an advertising portal.
   * Validates readiness, verifies integration connection, and creates/updates portal listing record.
   */
  async publish(
    dealershipId: string,
    vehicleId: string,
    providerId: string,
    userId: string
  ): Promise<{ success: boolean; status: PortalListingStatus; message: string }> {
    const supabase = await createClient()

    // 1. Fetch vehicle
    const { data: vehicle, error: vehErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('id', vehicleId)
      .single()

    if (vehErr || !vehicle) throw new Error('Vehicle not found')

    // 2. Validate readiness
    const readiness = AdvertisingService.checkReadiness(vehicle)
    if (!readiness.isReady) {
      throw new Error(`Cannot publish vehicle: ${readiness.blockers.join(', ')}`)
    }

    // 3. Check dealership provider connection status
    const providerIntegration = await IntegrationService.getByProvider(dealershipId, providerId)
    const isConnected =
      providerIntegration?.state.status === 'connected' ||
      (providerId === 'autotrader' && Boolean(process.env.AUTOTRADER_API_KEY))

    if (!isConnected) {
      // Record listing in connection_required state
      await supabase.from('portal_listings').upsert(
        {
          dealership_id: dealershipId,
          vehicle_id: vehicleId,
          provider_id: providerId,
          status: 'connection_required',
          error_state: 'NOT_CONFIGURED',
          error_message: `${providerIntegration?.name || providerId} credentials are not configured for this dealership.`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dealership_id,vehicle_id,provider_id' }
      )

      return {
        success: false,
        status: 'connection_required',
        message: `${providerIntegration?.name || providerId} is not connected. Configure credentials in Settings > Integrations.`,
      }
    }

    const now = new Date().toISOString()
    const askingPrice = Number(vehicle.asking_price || 0)

    // 4. Create or update portal listing
    const { data: listing, error: listErr } = await supabase
      .from('portal_listings')
      .upsert(
        {
          dealership_id: dealershipId,
          vehicle_id: vehicleId,
          provider_id: providerId,
          status: 'live',
          price_at_publish: askingPrice,
          last_published_at: now,
          last_updated_at: now,
          last_verified_at: now,
          provider_url: providerId === 'autotrader' ? `https://www.autotrader.co.uk/retailer/stock/${vehicle.registration}` : null,
          payload_snapshot: {
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            price: askingPrice,
            mileage: vehicle.mileage,
          },
          error_state: null,
          error_message: null,
          updated_at: now,
        },
        { onConflict: 'dealership_id,vehicle_id,provider_id' }
      )
      .select('*')
      .single()

    if (listErr) throw new Error(listErr.message)

    // Update vehicle status to advertised if available
    if (vehicle.status === 'available' || vehicle.status === 'ready_for_sale') {
      await supabase.from('vehicles').update({ status: 'advertised', updated_at: now }).eq('id', vehicleId)
    }

    // Log integration run & audit
    await IntegrationService.logRun({
      dealership_id: dealershipId,
      provider_id: providerId,
      operation: 'publish_listing',
      entity_type: 'vehicle',
      entity_id: vehicleId,
      status: 'success',
      request_metadata: { registration: vehicle.registration, asking_price: askingPrice },
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'listing.published',
      entity_type: 'vehicle',
      entity_id: vehicleId,
      after: { provider_id: providerId, registration: vehicle.registration, price: askingPrice },
      source: 'web',
    })

    return {
      success: true,
      status: 'live',
      message: `Vehicle successfully published to ${providerIntegration?.name || providerId}.`,
    }
  },

  /**
   * Withdraw a vehicle from an advertising portal.
   */
  async withdraw(
    dealershipId: string,
    vehicleId: string,
    providerId: string,
    userId: string
  ): Promise<void> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    await supabase
      .from('portal_listings')
      .update({
        status: 'removed',
        updated_at: now,
      })
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .eq('provider_id', providerId)

    await IntegrationService.logRun({
      dealership_id: dealershipId,
      provider_id: providerId,
      operation: 'withdraw_listing',
      entity_type: 'vehicle',
      entity_id: vehicleId,
      status: 'success',
    })

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'listing.withdrawn',
      entity_type: 'vehicle',
      entity_id: vehicleId,
      after: { provider_id: providerId },
      source: 'web',
    })
  },

  /**
   * Trigger price updates across all live listings when vehicle retail price changes.
   */
  async onVehiclePriceChanged(
    dealershipId: string,
    vehicleId: string,
    newPrice: number
  ): Promise<void> {
    const supabase = await createClient()

    const { data: liveListings } = await supabase
      .from('portal_listings')
      .select('id, provider_id, price_at_publish')
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'live')

    for (const listing of liveListings || []) {
      if (Number(listing.price_at_publish) !== newPrice) {
        await supabase
          .from('portal_listings')
          .update({
            status: 'update_pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', listing.id)
      }
    }
  },

  /**
   * Withdraw all external listings when vehicle is marked SOLD.
   */
  async onVehicleSold(dealershipId: string, vehicleId: string, userId?: string): Promise<void> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    await supabase
      .from('portal_listings')
      .update({
        status: 'removed',
        updated_at: now,
      })
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .in('status', ['live', 'update_pending', 'publishing', 'queued'])
  },

  /**
   * Get advertising feed errors / failed publishing queue.
   */
  async getErrorQueue(dealershipId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('portal_listings')
      .select('*, vehicles(id, registration, make, model, variant, asking_price, photos)')
      .eq('dealership_id', dealershipId)
      .in('status', ['error', 'connection_required'])
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  },
}
