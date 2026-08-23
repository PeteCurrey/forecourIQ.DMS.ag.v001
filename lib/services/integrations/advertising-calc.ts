export type PortalKey = 'autotrader' | 'motors' | 'cargurus' | 'ebay_motors' | 'pistonheads' | 'website'

export type PortalListingStatus =
  | 'not_published'
  | 'queued'
  | 'publishing'
  | 'live'
  | 'update_pending'
  | 'error'
  | 'removed'
  | 'unsupported'
  | 'connection_required'

export interface PortalListingRecord {
  id: string
  dealership_id: string
  vehicle_id: string
  provider_id: string
  external_listing_id?: string | null
  status: PortalListingStatus
  price_at_publish?: number | null
  last_published_at?: string | null
  last_updated_at?: string | null
  last_verified_at?: string | null
  provider_url?: string | null
  error_state?: string | null
  error_message?: string | null
  payload_snapshot?: Record<string, unknown>
  vehicles?: {
    id: string
    registration: string
    make: string
    model: string
    variant?: string | null
    asking_price: number
    status: string
    photos?: string[] | null
  }
}

export interface AdvertisingReadiness {
  isReady: boolean
  blockers: string[]
  warnings: string[]
}

/**
 * Pure client-safe helper to evaluate whether a vehicle meets advertising publication standards.
 */
export function checkAdvertisingReadiness(vehicle: {
  registration?: string | null
  make?: string | null
  model?: string | null
  asking_price?: number | null
  fuel_type?: string | null
  mileage?: number | null
  status?: string | null
  photos?: string[] | null
  derivative?: string | null
}): AdvertisingReadiness {
  const blockers: string[] = []
  const warnings: string[] = []

  if (!vehicle.registration) blockers.push('Registration number missing')
  if (!vehicle.make) blockers.push('Make not specified')
  if (!vehicle.model) blockers.push('Model not specified')
  if (!vehicle.asking_price || Number(vehicle.asking_price) <= 0) blockers.push('Asking price must be greater than £0')
  if (!vehicle.photos || vehicle.photos.length === 0) blockers.push('At least 1 vehicle photo required for advertising')

  if (!vehicle.fuel_type) warnings.push('Fuel type missing')
  if (vehicle.mileage === undefined || vehicle.mileage === null) warnings.push('Mileage not recorded')
  if (vehicle.status !== 'ready_for_sale' && vehicle.status !== 'advertised' && vehicle.status !== 'available') {
    warnings.push(`Vehicle lifecycle status is currently '${vehicle.status}'`)
  }

  return {
    isReady: blockers.length === 0,
    blockers,
    warnings,
  }
}
