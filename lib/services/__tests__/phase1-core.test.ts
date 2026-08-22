import test from 'node:test'
import assert from 'node:assert/strict'
import { VehicleService } from '../vehicle'

test('Commercial Economics: calculates total invested cost and gross margin correctly', () => {
  const vehicle = {
    registration: 'DN21XYZ',
    make: 'BMW',
    model: '3 Series',
    year: 2021,
    mileage: 28450,
    purchase_price: 21500,
    auction_fee: 350,
    transport_cost: 180,
    prep_cost: 400,
    other_acquisition_costs: 120,
    asking_price: 26995,
  }

  const additionalCosts = [
    { amount: 150 }, // Bodyshop touch-up
    { amount: 80 },  // Valeting
  ]

  const comms = VehicleService.calculateCommercials(vehicle as any, additionalCosts)

  // 21500 + 350 + 180 + 400 + 120 + 150 + 80 = 22780
  assert.equal(comms.totalInvestedCost, 22780)
  assert.equal(comms.purchasePrice, 21500)
  assert.equal(comms.totalAcquisitionCost, 22150)
  assert.equal(comms.askingPrice, 26995)

  // 26995 - 22780 = 4215
  assert.equal(comms.projectedGrossMargin, 4215)
  assert.equal(comms.projectedMarginPercent.toFixed(2), '15.61')
})

test('Advertising Readiness: accurately flags missing requirements', () => {
  // Incomplete vehicle (no photos, no asking price)
  const incomplete = {
    registration: 'AB12CDE',
    make: 'Audi',
    model: 'A3',
    year: 2020,
    mileage: 30000,
    asking_price: 0,
    vehicle_images: [],
  }

  const readiness1 = VehicleService.checkAdvertisingReadiness(incomplete as any)
  assert.equal(readiness1.isReady, false)
  assert.ok(readiness1.missingItems.includes('Retail asking price'))
  assert.ok(readiness1.missingItems.includes('At least 1 vehicle photograph'))

  // Complete vehicle
  const complete = {
    registration: 'AB12CDE',
    make: 'Audi',
    model: 'A3',
    year: 2020,
    mileage: 30000,
    asking_price: 18995,
    vehicle_images: [{ id: '1', url: 'https://example.com/img.jpg', is_primary: true }],
  }

  const readiness2 = VehicleService.checkAdvertisingReadiness(complete as any)
  assert.equal(readiness2.isReady, true)
  assert.equal(readiness2.missingItems.length, 0)
})

test('CSV Stock Export: formats headers and rows without corruption', () => {
  const sampleVehicles = [
    {
      id: '1',
      dealership_id: 'd1',
      registration: 'LD70AVK',
      make: 'Mercedes-Benz',
      model: 'A Class',
      variant: 'A200 AMG Line',
      year: 2020,
      mileage: 34000,
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      colour: 'Polar White',
      status: 'available' as const,
      purchase_date: '2026-08-01',
      purchase_price: 16800,
      auction_fee: 0,
      transport_cost: 150,
      prep_cost: 250,
      other_acquisition_costs: 0,
      asking_price: 20995,
      advert_ready: true,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    }
  ]

  const csv = VehicleService.exportToCSV(sampleVehicles)
  assert.ok(csv.includes('Registration,Make,Model,Variant,Year,Mileage'))
  assert.ok(csv.includes('"LD70AVK","Mercedes-Benz","A Class"'))
  assert.ok(csv.includes('20995.00'))
})
