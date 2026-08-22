/**
 * Pure calculation logic and type definitions for vehicles.
 * Safe to import in both Server and Client components.
 */

export type VehicleLifecycleStatus =
  | 'acquiring'
  | 'purchased'
  | 'in_transit'
  | 'arrived'
  | 'inspection'
  | 'preparation'
  | 'photography'
  | 'ready_for_sale'
  | 'available'
  | 'advertised'
  | 'reserved'
  | 'sold'
  | 'handover'
  | 'completed'
  | 'returned'
  | 'wholesale'
  | 'archived'

export interface VehicleRecord {
  id: string
  dealership_id: string
  location_id?: string | null
  assigned_user_id?: string | null
  registration: string
  vin?: string | null
  make: string
  model: string
  variant?: string | null
  year: number
  mileage: number
  colour?: string | null
  fuel_type?: string | null
  transmission?: string | null
  body_type?: string | null
  doors?: number | null
  engine_size?: string | null
  co2_g_per_km?: number | null
  keys_count?: number | null
  service_history?: string | null
  service_history_type?: string | null
  hpi_clear?: boolean | null
  hpi_status?: string | null
  hpi_checked_at?: string | null
  condition?: string | null
  body_condition?: string | null
  wheel_condition?: string | null
  tyre_condition?: string | null
  mot_expiry?: string | null
  mot_expiry_date?: string | null
  purchase_source?: string | null
  supplier_name?: string | null
  auction_house?: string | null
  purchase_date?: string | null
  purchase_reference?: string | null
  funding_source?: string | null
  purchase_price: number
  auction_fee: number
  transport_cost: number
  prep_cost: number
  other_acquisition_costs: number
  asking_price: number
  sold_price?: number | null
  sold_at?: string | null
  margin_amount?: number | null
  margin_percentage?: number | null
  status: VehicleLifecycleStatus
  status_changed_at?: string
  status_reason?: string | null
  advert_ready?: boolean
  advert_headline?: string | null
  advert_description?: string | null
  photos?: string[]
  primary_photo_index?: number
  description?: string | null
  highlights?: string[]
  internal_notes?: string | null
  created_at: string
  updated_at: string
  dealership_locations?: { name: string } | null
  profiles?: { full_name: string } | null
  vehicle_images?: { id: string; url: string; is_primary: boolean }[] | null
  preparation_jobs?: { id: string; title: string; status: string; actual_cost: number }[] | null
}

export interface StockKPISummary {
  totalRetailUnits: number
  totalStockValue: number
  totalRetailValue: number
  potentialGrossMargin: number
  averageGrossMargin: number
  averageDaysInStock: number
  vehiclesOver45Days: number
  vehiclesOver60Days: number
  vehiclesInPreparation: number
  vehiclesReserved: number
  ageingBreakdown: {
    under30: number
    days31to45: number
    days46to60: number
    days61to90: number
    over90: number
  }
}

export interface CommercialSummary {
  purchasePrice: number
  totalAcquisitionCost: number
  totalPreparationCost: number
  totalInvestedCost: number
  askingPrice: number
  projectedGrossMargin: number
  projectedMarginPercent: number
  daysOwned: number
  isAgeingStock: boolean
}

/**
 * Calculate deterministic commercial figures for a vehicle.
 */
export function calculateCommercials(
  vehicle: Partial<VehicleRecord>,
  additionalCosts: { amount: number }[] = []
): CommercialSummary {
  const purchase = Number(vehicle.purchase_price || 0)
  const auctionFee = Number(vehicle.auction_fee || 0)
  const transport = Number(vehicle.transport_cost || 0)
  const prep = Number(vehicle.prep_cost || 0)
  const otherAcq = Number(vehicle.other_acquisition_costs || 0)
  const extraCostsTotal = additionalCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0)

  const totalInvestedCost = purchase + auctionFee + transport + prep + otherAcq + extraCostsTotal
  const askingPrice = Number(vehicle.asking_price || 0)
  const projectedGrossMargin = askingPrice - totalInvestedCost
  const projectedMarginPercent = askingPrice > 0 ? (projectedGrossMargin / askingPrice) * 100 : 0

  const purchaseDate = vehicle.purchase_date || vehicle.created_at || new Date().toISOString()
  const daysOwned = Math.max(
    0,
    Math.floor((Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
  )

  return {
    purchasePrice: purchase,
    totalAcquisitionCost: purchase + auctionFee + transport + otherAcq,
    totalPreparationCost: prep,
    totalInvestedCost,
    askingPrice,
    projectedGrossMargin,
    projectedMarginPercent,
    daysOwned,
    isAgeingStock: daysOwned > 45,
  }
}

/**
 * Check whether a vehicle satisfies all deterministic conditions for advertising.
 */
export function checkAdvertisingReadiness(
  vehicle: Partial<VehicleRecord> & {
    vehicle_images?: { id: string; url: string; is_primary: boolean }[] | null
  }
) {
  const missing: string[] = []

  if (!vehicle.registration) missing.push('Registration number')
  if (!vehicle.make || !vehicle.model) missing.push('Make and model details')
  if (!vehicle.year) missing.push('Registration year')
  if (!vehicle.mileage || vehicle.mileage <= 0) missing.push('Current mileage')
  if (!vehicle.asking_price || vehicle.asking_price <= 0) missing.push('Retail asking price')

  const photoCount = vehicle.photos?.length || vehicle.vehicle_images?.length || 0
  if (photoCount === 0) missing.push('At least 1 vehicle photograph')

  return {
    isReady: missing.length === 0,
    missingItems: missing,
    photoCount,
  }
}

/**
 * Export stock to CSV formatted string.
 */
export function exportToCSV(vehicles: VehicleRecord[]): string {
  const headers = [
    'Registration',
    'Make',
    'Model',
    'Variant',
    'Year',
    'Mileage',
    'Fuel',
    'Transmission',
    'Colour',
    'Status',
    'Purchase Date',
    'Purchase Price',
    'Prep Cost',
    'Total Invested',
    'Asking Price',
    'Projected Margin',
    'Days Owned'
  ]

  const rows = vehicles.map(v => {
    const comms = calculateCommercials(v)
    return [
      `"${v.registration}"`,
      `"${v.make}"`,
      `"${v.model}"`,
      `"${v.variant || ''}"`,
      v.year,
      v.mileage,
      `"${v.fuel_type || ''}"`,
      `"${v.transmission || ''}"`,
      `"${v.colour || ''}"`,
      `"${v.status}"`,
      `"${v.purchase_date || v.created_at.split('T')[0]}"`,
      comms.purchasePrice.toFixed(2),
      comms.totalPreparationCost.toFixed(2),
      comms.totalInvestedCost.toFixed(2),
      comms.askingPrice.toFixed(2),
      comms.projectedGrossMargin.toFixed(2),
      comms.daysOwned
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
