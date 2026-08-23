/**
 * Merchandising Score
 *
 * Deterministic readiness score for vehicle website presentation.
 * Each check is explicit — no meaningless AI percentage.
 */

import type { MerchandisingScore, MerchandisingCheck } from '@/lib/types/public-website'

export function calculateMerchandisingScore(vehicle: {
  website_description?: string | null
  advert_headline?: string | null
  asking_price?: number | null
  fuel_type?: string | null
  mileage?: number | null
  body_type?: string | null
  transmission?: string | null
  colour?: string | null
  year?: number | null
  vehicle_images?: { id: string; url: string; is_primary: boolean }[] | null
  photos?: string[] | null
  featured?: boolean | null
}): MerchandisingScore {
  const imageCount =
    vehicle.vehicle_images?.length ?? vehicle.photos?.length ?? 0
  const hasPrimaryImage =
    vehicle.vehicle_images?.some((i) => i.is_primary) ?? imageCount > 0

  const checks: MerchandisingCheck[] = [
    {
      label: 'Website description written',
      passed: Boolean(vehicle.website_description && vehicle.website_description.length > 50),
      required: true,
    },
    {
      label: 'Advert headline set',
      passed: Boolean(vehicle.advert_headline && vehicle.advert_headline.length > 5),
      required: true,
    },
    {
      label: 'At least 10 photos uploaded',
      passed: imageCount >= 10,
      required: true,
    },
    {
      label: 'Primary / hero image set',
      passed: hasPrimaryImage,
      required: true,
    },
    {
      label: 'Retail price set',
      passed: Boolean(vehicle.asking_price && Number(vehicle.asking_price) > 0),
      required: true,
    },
    {
      label: 'Fuel type recorded',
      passed: Boolean(vehicle.fuel_type),
      required: false,
    },
    {
      label: 'Mileage recorded',
      passed: vehicle.mileage !== undefined && vehicle.mileage !== null,
      required: false,
    },
    {
      label: 'Body type recorded',
      passed: Boolean(vehicle.body_type),
      required: false,
    },
    {
      label: 'Marked as featured',
      passed: Boolean(vehicle.featured),
      required: false,
    },
  ]

  const score = checks.filter((c) => c.passed).length
  const max = checks.length

  return {
    score,
    max,
    percentage: Math.round((score / max) * 100),
    isReady: checks.filter((c) => c.required).every((c) => c.passed),
    checks,
  }
}

/**
 * Generate a stable, SEO-friendly URL slug for a vehicle.
 * Format: make-model-year-reg (lower-kebab-case)
 * Registration is included to ensure uniqueness without being the primary identifier.
 */
export function generateVehicleSlug(vehicle: {
  make: string
  model: string
  year: number
  registration: string
  variant?: string | null
}): string {
  const parts = [
    vehicle.make,
    vehicle.model,
    vehicle.variant,
    String(vehicle.year),
    vehicle.registration,
  ]
    .filter(Boolean)
    .map((p) =>
      (p as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )

  return parts.join('-')
}
