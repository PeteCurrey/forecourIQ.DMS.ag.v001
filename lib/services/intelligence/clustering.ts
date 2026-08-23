import { VehicleCluster } from '@/lib/types/intelligence'

/**
 * Vehicle Clustering & Classification Engine
 *
 * Normalises vehicle specifications into comparable clusters.
 * Ensures base models (e.g. BMW 320d) and performance variants (e.g. BMW M340i)
 * are NEVER treated as commercially identical units.
 */

export function normalizeVehicleString(str?: string | null): string {
  if (!str) return ''
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function extractMileageBand(mileage: number): string {
  if (mileage < 20000) return 'under_20k'
  if (mileage < 40000) return '20k_40k'
  if (mileage < 60000) return '40k_60k'
  if (mileage < 80000) return '60k_80k'
  if (mileage < 100000) return '80k_100k'
  return 'over_100k'
}

export function generateClusterCode(vehicle: {
  make: string
  model: string
  variant?: string | null
  year?: number | null
  fuel_type?: string | null
  transmission?: string | null
  mileage?: number | null
}): string {
  const makeClean = normalizeVehicleString(vehicle.make)
  const modelClean = normalizeVehicleString(vehicle.model)
  const variantClean = vehicle.variant ? normalizeVehicleString(vehicle.variant) : 'base'
  const fuelClean = vehicle.fuel_type ? normalizeVehicleString(vehicle.fuel_type) : 'any'
  const transClean = vehicle.transmission ? normalizeVehicleString(vehicle.transmission) : 'any'
  
  // Year band (2-year grouping for comparable generation matching)
  let yearBand = 'any'
  if (vehicle.year) {
    const startYear = Math.floor(vehicle.year / 2) * 2
    yearBand = `${startYear}-${startYear + 1}`
  }

  const mileageBand = vehicle.mileage ? extractMileageBand(vehicle.mileage) : 'any'

  return `${makeClean}_${modelClean}_${variantClean}_${fuelClean}_${transClean}_${yearBand}_${mileageBand}`
}

export function createVehicleCluster(vehicle: {
  make: string
  model: string
  variant?: string | null
  derivative?: string | null
  generation?: string | null
  fuel_type?: string | null
  transmission?: string | null
  body_type?: string | null
  year?: number | null
  mileage?: number | null
}): VehicleCluster {
  const cluster_code = generateClusterCode(vehicle)
  const yearMin = vehicle.year ? vehicle.year - 1 : null
  const yearMax = vehicle.year ? vehicle.year + 1 : null
  const mileage_band = vehicle.mileage ? extractMileageBand(vehicle.mileage) : null

  return {
    cluster_code,
    make: vehicle.make.trim(),
    model: vehicle.model.trim(),
    derivative: vehicle.derivative || vehicle.variant || null,
    generation: vehicle.generation || null,
    fuel_type: vehicle.fuel_type || null,
    transmission: vehicle.transmission || null,
    body_type: vehicle.body_type || null,
    year_min: yearMin,
    year_max: yearMax,
    mileage_band,
  }
}

/**
 * Matches a vehicle against a cluster, returning a match confidence.
 */
export function matchVehicleToCluster(
  vehicle: {
    make: string
    model: string
    variant?: string | null
    year?: number | null
    fuel_type?: string | null
    transmission?: string | null
    mileage?: number | null
  },
  cluster: VehicleCluster
): { isMatch: boolean; confidence: 'exact' | 'high' | 'partial' | 'none' } {
  if (
    normalizeVehicleString(vehicle.make) !== normalizeVehicleString(cluster.make) ||
    normalizeVehicleString(vehicle.model) !== normalizeVehicleString(cluster.model)
  ) {
    return { isMatch: false, confidence: 'none' }
  }

  // Check variant / derivative
  const vehicleVariant = normalizeVehicleString(vehicle.variant)
  const clusterVariant = normalizeVehicleString(cluster.derivative)

  let variantMatches = false
  if (!clusterVariant || clusterVariant === 'base') {
    variantMatches = true
  } else if (vehicleVariant) {
    variantMatches = vehicleVariant.includes(clusterVariant) || clusterVariant.includes(vehicleVariant)
  }

  if (!variantMatches) {
    return { isMatch: false, confidence: 'none' }
  }

  const fuelMatches = !cluster.fuel_type || normalizeVehicleString(vehicle.fuel_type) === normalizeVehicleString(cluster.fuel_type)
  const transMatches = !cluster.transmission || normalizeVehicleString(vehicle.transmission) === normalizeVehicleString(cluster.transmission)

  const yearMatches =
    !cluster.year_min ||
    !cluster.year_max ||
    !vehicle.year ||
    (vehicle.year >= cluster.year_min && vehicle.year <= cluster.year_max)

  if (!fuelMatches || !yearMatches) {
    return { isMatch: false, confidence: 'none' }
  }

  if (variantMatches && fuelMatches && transMatches && yearMatches) {
    return { isMatch: true, confidence: 'exact' }
  }

  return { isMatch: true, confidence: 'high' }
}
