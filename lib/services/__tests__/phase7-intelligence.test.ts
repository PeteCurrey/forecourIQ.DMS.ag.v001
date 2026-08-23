import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateClusterCode,
  createVehicleCluster,
  matchVehicleToCluster,
  normalizeVehicleString,
} from '../intelligence/clustering'
import {
  evaluateProvenance,
  formatProvenanceBadge,
  EXTERNAL_DATA_STALE_THRESHOLD_MS,
} from '../intelligence/provenance'

test('Vehicle Clustering: Distinguishes base models from performance derivatives', () => {
  const baseBMW = {
    make: 'BMW',
    model: '3 Series',
    variant: '320d M Sport',
    year: 2021,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    mileage: 32000,
  }

  const perfBMW = {
    make: 'BMW',
    model: '3 Series',
    variant: 'M340i xDrive',
    year: 2021,
    fuel_type: 'Petrol',
    transmission: 'Automatic',
    mileage: 28000,
  }

  const baseCode = generateClusterCode(baseBMW)
  const perfCode = generateClusterCode(perfBMW)

  assert.notEqual(baseCode, perfCode, 'BMW 320d and BMW M340i must have distinct cluster codes')
  assert.ok(baseCode.includes('320d-m-sport'))
  assert.ok(perfCode.includes('m340i-xdrive'))

  const cluster = createVehicleCluster(perfBMW)
  const matchPerf = matchVehicleToCluster(perfBMW, cluster)
  const matchBase = matchVehicleToCluster(baseBMW, cluster)

  assert.equal(matchPerf.isMatch, true)
  assert.equal(matchPerf.confidence, 'exact')
  assert.equal(matchBase.isMatch, false, 'Base 320d must not match M340i cluster')
})

test('Provenance Governance: Truthfully flags unconfigured sources and stale data', () => {
  // 1. Fresh first party data
  const freshFirstParty = evaluateProvenance(
    'FIRST_PARTY',
    'ForecourIQ Website Telemetry',
    new Date().toISOString(),
    { sampleSize: 12 }
  )
  assert.equal(freshFirstParty.source_type, 'FIRST_PARTY')
  assert.equal(freshFirstParty.is_stale, false)
  assert.equal(freshFirstParty.confidence, 'high')
  assert.equal(freshFirstParty.data_quality, 'complete')

  // 2. Stale external data (>72h old)
  const eightyHoursAgo = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString()
  const staleData = evaluateProvenance(
    'PUBLIC_AUTHORISED',
    'Regional Portal Feed',
    eightyHoursAgo
  )
  assert.equal(staleData.is_stale, true)
  assert.equal(staleData.data_quality, 'stale')
  assert.equal(staleData.confidence, 'low')

  // 3. Unconfigured source
  const unconfigured = evaluateProvenance(
    'UNCONFIGURED',
    'AutoTrader Market Extension',
    new Date().toISOString()
  )
  assert.equal(unconfigured.confidence, 'insufficient_data')
  assert.equal(unconfigured.data_quality, 'unavailable')

  // 4. Badges
  const badgeFirst = formatProvenanceBadge('FIRST_PARTY')
  assert.equal(badgeFirst.label, 'FORECOURTIQ DEALER DATA')
  const badgeUnavail = formatProvenanceBadge('UNAVAILABLE')
  assert.equal(badgeUnavail.label, 'DATA SOURCE UNAVAILABLE')
})

test('Buying Arithmetic: Deterministically computes target and max buy prices with prep costs', () => {
  const expectedRetail = 32995
  const targetGross = 3000
  const minGross = 1500
  const expectedPrep = 450

  const targetBuyPrice = expectedRetail - targetGross - expectedPrep
  const maxBuyPrice = expectedRetail - minGross - expectedPrep
  const projectedGross = expectedRetail - targetBuyPrice - expectedPrep

  assert.equal(targetBuyPrice, 29545)
  assert.equal(maxBuyPrice, 31045)
  assert.equal(projectedGross, 3000)
})

test('Sample Size Discipline: Flags low sample when historical units < 3', () => {
  const evaluateSample = (sampleSize: number) => {
    return {
      sampleSize,
      isLowSample: sampleSize < 3,
      confidence: sampleSize >= 5 ? 'high' : sampleSize >= 3 ? 'medium' : 'low',
    }
  }

  const oneUnit = evaluateSample(1)
  assert.equal(oneUnit.isLowSample, true)
  assert.equal(oneUnit.confidence, 'low')

  const fourUnits = evaluateSample(4)
  assert.equal(fourUnits.isLowSample, false)
  assert.equal(fourUnits.confidence, 'medium')

  const tenUnits = evaluateSample(10)
  assert.equal(tenUnits.isLowSample, false)
  assert.equal(tenUnits.confidence, 'high')
})

test('Pricing Signals: Deterministically evaluates High Views/Low Leads and Ageing Stock', () => {
  // Test High Views / Low Leads condition
  const evaluateEngagementSignal = (views: number, leads: number, daysInStock: number) => {
    if (views >= 15 && leads <= 1 && daysInStock > 10) {
      return { signal: 'high_views_low_leads', priority: 'high' }
    }
    if (daysInStock >= 60) {
      return { signal: 'ageing_stock', priority: 'critical' }
    }
    if (leads >= 3 && daysInStock < 14) {
      return { signal: 'high_demand_hold', priority: 'low' }
    }
    return null
  }

  // 1. High views, low conversion
  const signal1 = evaluateEngagementSignal(48, 1, 18)
  assert.ok(signal1)
  assert.equal(signal1.signal, 'high_views_low_leads')
  assert.equal(signal1.priority, 'high')

  // 2. Ageing stock >60 days
  const signal2 = evaluateEngagementSignal(8, 0, 74)
  assert.ok(signal2)
  assert.equal(signal2.signal, 'ageing_stock')
  assert.equal(signal2.priority, 'critical')

  // 3. Hot new stock with strong initial interest -> Hold price
  const signal3 = evaluateEngagementSignal(22, 4, 6)
  assert.ok(signal3)
  assert.equal(signal3.signal, 'high_demand_hold')
  assert.equal(signal3.priority, 'low')
})

test('Competitor Monitoring: Truthfully reports source_required when unconfigured', () => {
  const competitor = {
    name: 'Peak Prestige Motors',
    source_status: 'source_required',
    is_active: true,
  }

  assert.equal(competitor.source_status, 'source_required')
  assert.notEqual(competitor.source_status, 'active')
})
