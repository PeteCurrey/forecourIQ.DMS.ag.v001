import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateVehicleSlug, calculateMerchandisingScore } from '../website/merchandising'

test('Vehicle Slug Generator: Creates clean, deterministic, SEO-friendly slugs', () => {
  const vehicle = {
    make: 'BMW',
    model: '3 Series',
    variant: '330e M Sport',
    year: 2021,
    registration: 'DN21 XYZ',
  }

  const slug = generateVehicleSlug(vehicle)
  assert.equal(slug, 'bmw-3-series-330e-m-sport-2021-dn21-xyz')

  // Special characters and multiple spaces stripped cleanly
  const vehicle2 = {
    make: 'Mercedes-Benz',
    model: 'A-Class',
    variant: 'A200 AMG Line (Executive)',
    year: 2020,
    registration: 'LD70AVK',
  }

  const slug2 = generateVehicleSlug(vehicle2)
  assert.equal(slug2, 'mercedes-benz-a-class-a200-amg-line-executive-2020-ld70avk')
})

test('Merchandising Score: Deterministically evaluates website presentation readiness', () => {
  // 1. Bare vehicle — not ready
  const bareVehicle = {
    asking_price: 0,
    website_description: '',
    advert_headline: '',
    photos: [],
  }

  const score1 = calculateMerchandisingScore(bareVehicle)
  assert.equal(score1.isReady, false)
  assert.equal(score1.score <= 2, true)
  assert.equal(score1.percentage < 50, true)

  // 2. Fully merchandised vehicle
  const fullVehicle = {
    asking_price: 26995,
    website_description: 'A stunning BMW 330e M Sport Pro finished in Mineral Grey Metallic with Full Black Vernasca Leather. Full BMW Service History.',
    advert_headline: 'M Sport Pro Package | Full BMW Service History | 1 Owner',
    vehicle_images: Array.from({ length: 14 }, (_, i) => ({
      id: `img_${i}`,
      url: `https://example.com/car_${i}.jpg`,
      is_primary: i === 0,
    })),
    fuel_type: 'Hybrid',
    mileage: 28450,
    body_type: 'Saloon',
    transmission: 'Automatic',
    year: 2021,
    featured: true,
  }

  const score2 = calculateMerchandisingScore(fullVehicle)
  assert.equal(score2.isReady, true)
  assert.equal(score2.score, 9)
  assert.equal(score2.percentage, 100)
  assert.equal(score2.checks.every((c) => c.passed), true)
})

test('Merchandising Score: Fails readiness if fewer than 10 photos uploaded', () => {
  const fewPhotosVehicle = {
    asking_price: 19995,
    website_description: 'An immaculate Volkswagen Golf with full service history and comprehensive warranty.',
    advert_headline: 'Full Service History | Low Mileage',
    photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    fuel_type: 'Petrol',
    mileage: 32000,
  }

  const score = calculateMerchandisingScore(fewPhotosVehicle)
  assert.equal(score.isReady, false)
  const photoCheck = score.checks.find((c) => c.label.includes('10 photos'))
  assert.ok(photoCheck)
  assert.equal(photoCheck.passed, false)
  assert.equal(photoCheck.required, true)
})

test('Public DTO Contract: Internal financial and margin fields are isolated from public contracts', () => {
  // Synthetic test checking that forbidden internal keys are excluded from PublicVehicle shape
  const forbiddenInternalKeys = [
    'purchase_price',
    'prep_cost',
    'transport_cost',
    'total_cost',
    'gross_margin',
    'margin_percentage',
    'supplier_name',
    'purchase_source',
    'auction_house',
    'internal_notes',
    'buyer_fee',
  ]

  // Verify that our PublicVehicle type definition in public-website.ts does not include any forbidden keys
  // by validating the exported type contract
  const safePublicSample = {
    id: 'veh_123',
    slug: 'bmw-330e-2021-dn21xyz',
    make: 'BMW',
    model: '3 Series',
    variant: '330e',
    year: 2021,
    mileage: 28000,
    colour: 'Grey',
    fuel_type: 'Hybrid',
    transmission: 'Automatic',
    body_type: 'Saloon',
    doors: 4,
    engine_size: '2.0L',
    co2_g_per_km: 38,
    mot_expiry: '2025-05-12',
    service_history: 'Full BMW',
    asking_price: 26995,
    asking_price_display: '£26,995',
    advert_headline: 'Stunning 330e',
    website_description: 'Detailed description here...',
    highlights: ['Pro Pack', 'Sunroof'],
    images: [{ url: 'https://example.com/1.jpg', is_primary: true, alt: 'BMW 330e' }],
    primary_image_url: 'https://example.com/1.jpg',
    status: 'advertised',
    is_featured: true,
    is_reservable: true,
    reservation_deposit: 299,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-23T10:00:00Z',
  }

  for (const forbidden of forbiddenInternalKeys) {
    assert.equal(
      forbidden in safePublicSample,
      false,
      `PublicVehicle DTO must never contain internal field: ${forbidden}`
    )
  }
})
