import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PROVIDER_DEFINITIONS,
  getProviderById,
  getProvidersByCategory,
  CATEGORY_LABELS,
  IntegrationCategory,
} from '../integrations/registry'
import { AdvertisingService } from '../integrations/advertising'

test('Integration Registry: Contains all 18 canonical providers across 9 categories', () => {
  assert.equal(PROVIDER_DEFINITIONS.length >= 18, true, 'Must have at least 18 canonical providers')

  const expectedCategories = [
    'vehicle_data',
    'advertising',
    'communications',
    'finance',
    'accounting',
    'payments',
    'esignature',
    'identity',
    'acquisition',
  ]

  for (const cat of expectedCategories) {
    const providers = getProvidersByCategory(cat as IntegrationCategory)
    assert.equal(providers.length > 0, true, `Category ${cat} must contain at least one provider`)
    assert.ok(CATEGORY_LABELS[cat as IntegrationCategory], `Category ${cat} must have a human-readable label`)
  }

  // Key automotive providers
  assert.ok(getProviderById('dvla'), 'DVLA provider must be registered')
  assert.ok(getProviderById('cap_hpi'), 'CAP HPI provider must be registered')
  assert.ok(getProviderById('autotrader'), 'AutoTrader provider must be registered')
  assert.ok(getProviderById('xero'), 'Xero provider must be registered')
  assert.ok(getProviderById('codeweavers'), 'Codeweavers provider must be registered')
})

test('Advertising Readiness: Accurately blocks publishing when vehicle data is incomplete', () => {
  // 1. Incomplete vehicle
  const incompleteVehicle = {
    registration: '',
    make: '',
    model: '',
    asking_price: 0,
    photos: [],
  }

  const result1 = AdvertisingService.checkReadiness(incompleteVehicle)
  assert.equal(result1.isReady, false)
  assert.equal(result1.blockers.length >= 4, true)
  assert.ok(result1.blockers.some((b) => b.includes('Registration')))
  assert.ok(result1.blockers.some((b) => b.includes('Make')))
  assert.ok(result1.blockers.some((b) => b.includes('Model')))
  assert.ok(result1.blockers.some((b) => b.includes('Asking price')))
  assert.ok(result1.blockers.some((b) => b.includes('photo')))

  // 2. Fully compliant vehicle
  const compliantVehicle = {
    registration: 'KP69VWT',
    make: 'BMW',
    model: '3 Series',
    derivative: '320d M Sport',
    asking_price: 21995,
    fuel_type: 'Diesel',
    mileage: 42000,
    status: 'ready_for_sale',
    photos: ['https://example.com/bmw1.jpg', 'https://example.com/bmw2.jpg'],
  }

  const result2 = AdvertisingService.checkReadiness(compliantVehicle)
  assert.equal(result2.isReady, true)
  assert.equal(result2.blockers.length, 0)
})

test('Advertising Readiness: Accurately flags missing fuel type and mileage as warnings', () => {
  const partialVehicle = {
    registration: 'GL18XYZ',
    make: 'Audi',
    model: 'A4',
    asking_price: 15495,
    photos: ['https://example.com/audi1.jpg'],
    fuel_type: null,
    mileage: null,
    status: 'available',
  }

  const result = AdvertisingService.checkReadiness(partialVehicle)
  assert.equal(result.isReady, true) // blockers = 0, so ready to publish
  assert.ok(result.warnings.some((w) => w.includes('Fuel type')))
  assert.ok(result.warnings.some((w) => w.includes('Mileage')))
})

test('Truthful Provider Declaration: AutoTrader requires commercial access when unconfigured', () => {
  const autoTrader = getProviderById('autotrader')
  assert.ok(autoTrader)
  assert.equal(autoTrader.authType, 'api_key')
  assert.equal(autoTrader.supportsWebhooks, true)
  assert.ok(autoTrader.commercialRequirement?.includes('AutoTrader'))
  assert.deepEqual(autoTrader.requiredFields, ['advertiser_id', 'api_key'])
})

test('Truthful Provider Declaration: Xero uses OAuth2 and declares requirements', () => {
  const xero = getProviderById('xero')
  assert.ok(xero)
  assert.equal(xero.authType, 'oauth2')
  assert.equal(xero.supportsOAuth, true)
  assert.deepEqual(xero.requiredFields, ['client_id', 'client_secret'])
})
