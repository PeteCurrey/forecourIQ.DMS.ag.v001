import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateDaysInStock, 
  getAgingSeverity, 
  applyBulkPriceAdjustment, 
  calculateLandedCost 
} from '../vehicle-calc';
import { 
  vehicleInputSchema, 
  bulkStatusChangeSchema, 
  bulkPriceAdjustmentSchema,
  savedFilterPresetSchema 
} from '../../schemas/vehicle-schema';

describe('Phase 2: Stock Management — Days in Stock Calculation', () => {
  it('correctly calculates elapsed days from past date', () => {
    const reference = new Date('2026-09-15T12:00:00Z');
    const purchaseDate = new Date('2026-08-01T12:00:00Z'); // 45 days prior
    const days = calculateDaysInStock(purchaseDate, reference);
    assert.equal(days, 45);
  });

  it('handles null, undefined or empty input cleanly', () => {
    assert.equal(calculateDaysInStock(null), 0);
    assert.equal(calculateDaysInStock(undefined), 0);
    assert.equal(calculateDaysInStock(''), 0);
  });

  it('returns 0 for future dates without negative days', () => {
    const reference = new Date('2026-09-15T12:00:00Z');
    const futureDate = new Date('2026-09-20T12:00:00Z');
    assert.equal(calculateDaysInStock(futureDate, reference), 0);
  });
});

describe('Phase 2: Stock Management — Aging Severity Escalation', () => {
  it('returns ok for fresh stock under 30 days', () => {
    assert.equal(getAgingSeverity(12), 'ok');
    assert.equal(getAgingSeverity(29), 'ok');
  });

  it('returns info for stock in target window 31-45 days', () => {
    assert.equal(getAgingSeverity(35), 'info');
    assert.equal(getAgingSeverity(44), 'info');
  });

  it('returns warning for stock crossing 45-day threshold', () => {
    assert.equal(getAgingSeverity(45), 'warning');
    assert.equal(getAgingSeverity(58), 'warning');
  });

  it('returns danger for stock crossing 60-day critical threshold', () => {
    assert.equal(getAgingSeverity(60), 'danger');
    assert.equal(getAgingSeverity(95), 'danger');
  });

  it('respects dealer-configurable aging thresholds', () => {
    const custom = { warn: 35, danger: 50, critical: 75 };
    assert.equal(getAgingSeverity(30, custom), 'ok');
    assert.equal(getAgingSeverity(38, custom), 'warning');
    assert.equal(getAgingSeverity(52, custom), 'danger');
  });
});

describe('Phase 2: Stock Management — Bulk Price Adjustment Logic', () => {
  it('applies percentage price reductions correctly', () => {
    const initial = 20000;
    const reduced = applyBulkPriceAdjustment(initial, 'percent', -5);
    assert.equal(reduced, 19000);
  });

  it('applies percentage price increases correctly', () => {
    const initial = 15000;
    const increased = applyBulkPriceAdjustment(initial, 'percent', 10);
    assert.equal(increased, 16500);
  });

  it('applies fixed amount price adjustments', () => {
    const initial = 24995;
    const reduced = applyBulkPriceAdjustment(initial, 'fixed', -500);
    assert.equal(reduced, 24495);
  });

  it('never reduces price below zero', () => {
    const initial = 1000;
    const clamped = applyBulkPriceAdjustment(initial, 'fixed', -5000);
    assert.equal(clamped, 0);
  });
});

describe('Phase 2: Stock Management — True Landed Cost Roll-up', () => {
  it('aggregates purchase price, prep jobs, and transport costs', () => {
    const purchase = 18500;
    const prep = 750; // sum of mechanical & tyres
    const transport = 250;
    const other = 100;
    const landed = calculateLandedCost(purchase, prep, transport, other);
    assert.equal(landed, 19600);
  });

  it('handles zero or missing prep costs without NaN', () => {
    const landed = calculateLandedCost(15000, 0);
    assert.equal(landed, 15000);
  });
});

describe('Phase 2: Stock Management — Zod Validation Schemas', () => {
  it('normalises UK registration plate string to uppercase without spaces', () => {
    const parsed = vehicleInputSchema.parse({
      registration: 'ab21 xyz ',
      make: 'Audi',
      model: 'RS4',
      year: 2021,
      mileage: 24000,
    });
    assert.equal(parsed.registration, 'AB21XYZ');
  });

  it('rejects invalid years and negative mileage', () => {
    assert.throws(() => {
      vehicleInputSchema.parse({
        registration: 'AB21XYZ',
        make: 'Audi',
        model: 'RS4',
        year: 1850,
        mileage: -100,
      });
    });
  });

  it('validates bulk price adjustment schema and blocks zero adjustment', () => {
    assert.throws(() => {
      bulkPriceAdjustmentSchema.parse({
        vehicleIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
        adjustmentType: 'percent',
        amount: 0,
      });
    });
  });

  it('validates saved filter preset schema', () => {
    const valid = savedFilterPresetSchema.parse({
      name: 'BMW Under 45d',
      filters: { make: 'BMW', maxDays: 45 },
      is_default: true,
    });
    assert.equal(valid.name, 'BMW Under 45d');
    assert.equal(valid.is_default, true);
  });
});
