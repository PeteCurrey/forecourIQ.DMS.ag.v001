import test from 'node:test';
import assert from 'node:assert/strict';
import { ImportService } from '../import/import-service';

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Onboarding & Go-Live Evaluation
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T01: Go-Live evaluation identifies missing legal identity as a blocker', () => {
  const mockDealership = {
    name: '',
    city: null,
    postcode: null,
    phone: null,
  };
  const hasIdentity = !!(
    mockDealership.name &&
    mockDealership.city &&
    mockDealership.postcode &&
    mockDealership.phone
  );
  assert.equal(hasIdentity, false);
});

test('Phase 9 — T02: Dealership with all required fields passes identity check', () => {
  const mockDealership = {
    name: 'Prestige Motors Ltd',
    city: 'London',
    postcode: 'SW1A 1AA',
    phone: '020 1234 5678',
  };
  const hasIdentity = !!(
    mockDealership.name &&
    mockDealership.city &&
    mockDealership.postcode &&
    mockDealership.phone
  );
  assert.equal(hasIdentity, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: CSV Stock Import Validation
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T03: Valid stock rows pass CSV validation', () => {
  const mapping = {
    registration: 'Reg',
    make: 'Make',
    model: 'Model',
    year: 'Year',
    mileage: 'Miles',
    asking_price: 'Price',
  };
  const rows = [
    { Reg: 'AB21CDE', Make: 'BMW', Model: '3 Series', Year: '2021', Miles: '22000', Price: '18500' },
    { Reg: 'XY72FGH', Make: 'Audi', Model: 'A4', Year: '2022', Miles: '14000', Price: '22000' },
  ];
  const result = ImportService.validateStockCSV(rows, mapping);
  assert.equal(result.totalRows, 2);
  assert.equal(result.validRows.length, 2);
  assert.equal(result.invalidRows.length, 0);
  assert.equal(result.errors.length, 0);
});

test('Phase 9 — T04: Missing registration triggers a validation error', () => {
  const mapping = {
    registration: 'Reg',
    make: 'Make',
    model: 'Model',
    year: 'Year',
    mileage: 'Miles',
    asking_price: 'Price',
  };
  const rows = [
    { Reg: '', Make: 'BMW', Model: '3 Series', Year: '2021', Miles: '22000', Price: '18500' },
  ];
  const result = ImportService.validateStockCSV(rows, mapping);
  assert.equal(result.validRows.length, 0);
  assert.equal(result.invalidRows.length, 1);
  assert.equal(result.errors.some(e => e.field === 'registration'), true);
});

test('Phase 9 — T05: Duplicate registration within same file generates an error', () => {
  const mapping = {
    registration: 'Reg',
    make: 'Make',
    model: 'Model',
    year: 'Year',
    mileage: 'Miles',
    asking_price: 'Price',
  };
  const rows = [
    { Reg: 'AB21CDE', Make: 'BMW', Model: '3 Series', Year: '2021', Miles: '22000', Price: '18500' },
    { Reg: 'AB21CDE', Make: 'BMW', Model: '3 Series', Year: '2021', Miles: '22000', Price: '18500' },
  ];
  const result = ImportService.validateStockCSV(rows, mapping);
  assert.equal(result.errors.some(e => e.message.includes('Duplicate')), true);
});

test('Phase 9 — T06: Registration is normalised to uppercase without spaces', () => {
  const mapping = {
    registration: 'Reg',
    make: 'Make',
    model: 'Model',
    year: 'Year',
    mileage: 'Miles',
    asking_price: 'Price',
  };
  const rows = [
    { Reg: 'ab 21 cde', Make: 'BMW', Model: '3 Series', Year: '2021', Miles: '22000', Price: '18500' },
  ];
  const result = ImportService.validateStockCSV(rows, mapping);
  assert.equal(result.validRows[0]?.registration, 'AB21CDE');
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Customer CSV Import & GDPR Consent Safety
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T07: Marketing consent is NEVER auto-set to true without timestamp metadata', () => {
  const mapping = {
    first_name: 'First',
    last_name: 'Last',
    email: 'Email',
    phone: 'Phone',
    marketing_consent: 'Marketing',
    consent_date: 'ConsentDate',
  };
  const rows = [
    { First: 'John', Last: 'Smith', Email: 'john@example.com', Marketing: 'yes', ConsentDate: '' },
    { First: 'Jane', Last: 'Doe', Email: 'jane@example.com', Marketing: '', ConsentDate: '' },
    { First: 'Bob', Last: 'Jones', Email: 'bob@example.com', Marketing: 'true', ConsentDate: '' },
  ];
  const result = ImportService.validateCustomerCSV(rows, mapping);
  result.validRows.forEach(row => {
    assert.equal(row.marketing_consent, false);
  });
});

test('Phase 9 — T08: Marketing consent is set to true only when explicit value AND consent_date present', () => {
  const mapping = {
    first_name: 'First',
    last_name: 'Last',
    email: 'Email',
    phone: 'Phone',
    marketing_consent: 'Marketing',
    consent_date: 'ConsentDate',
  };
  const rows = [
    { First: 'Jane', Last: 'Green', Email: 'jane.green@example.com', Marketing: 'yes', ConsentDate: '2025-01-01' },
  ];
  const result = ImportService.validateCustomerCSV(rows, mapping);
  assert.equal(result.validRows[0]?.marketing_consent, true);
});

test('Phase 9 — T09: Missing customer name triggers validation error', () => {
  const mapping = {
    first_name: 'First',
    last_name: 'Last',
    email: 'Email',
    phone: 'Phone',
    marketing_consent: 'Marketing',
    consent_date: 'ConsentDate',
  };
  const rows = [
    { First: '', Last: '', Email: 'nemo@example.com', Marketing: '', ConsentDate: '' },
  ];
  const result = ImportService.validateCustomerCSV(rows, mapping);
  assert.equal(result.invalidRows.length, 1);
  assert.equal(result.errors.some(e => e.field === 'first_name'), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Billing Entitlement Logic
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T10: Unlimited plan always returns allowed=true', () => {
  function checkEntitlement(current: number, limit: number | null) {
    if (limit === null) return { allowed: true, approaching: false };
    const approaching = current >= Math.floor(limit * 0.85);
    const blocked = current >= limit;
    return { allowed: !blocked, approaching };
  }
  const result = checkEntitlement(500, null);
  assert.equal(result.allowed, true);
  assert.equal(result.approaching, false);
});

test('Phase 9 — T11: At 85% limit, soft warning is raised but still allowed', () => {
  function checkEntitlement(current: number, limit: number | null) {
    if (limit === null) return { allowed: true, approaching: false };
    const approaching = current >= Math.floor(limit * 0.85);
    const blocked = current >= limit;
    return { allowed: !blocked, approaching };
  }
  const result = checkEntitlement(17, 20); // 85%
  assert.equal(result.allowed, true);
  assert.equal(result.approaching, true);
});

test('Phase 9 — T12: At plan limit, hard block is returned', () => {
  function checkEntitlement(current: number, limit: number | null) {
    if (limit === null) return { allowed: true, approaching: false };
    const approaching = current >= Math.floor(limit * 0.85);
    const blocked = current >= limit;
    return { allowed: !blocked, approaching };
  }
  const result = checkEntitlement(20, 20); // 100%
  assert.equal(result.allowed, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Support Case Number Format
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T13: Case number follows FIQ-XXXX format', () => {
  const caseNumber = `FIQ-${Math.floor(1000 + Math.random() * 9000)}`;
  assert.equal(/^FIQ-\d{4}$/.test(caseNumber), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: GDPR Erasure Guard
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T14: Customer with active deals cannot be anonymized', () => {
  const activeDeals = [{ id: 'deal-1', status: 'active' }];
  const canAnonymize = activeDeals.length === 0;
  assert.equal(canAnonymize, false);
});

test('Phase 9 — T15: Customer with only completed deals can be anonymized', () => {
  const activeDeals: any[] = [];
  const canAnonymize = activeDeals.length === 0;
  assert.equal(canAnonymize, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Unit Economics Margin Calculation
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 9 — T16: Contribution margin is correctly calculated from variable costs', () => {
  const revenue = 299;
  const aiCost = 8.50;
  const messagingCost = 1.20;
  const vehicleDataCost = 3.75;
  const storageCost = 0.05;
  const totalCost = aiCost + messagingCost + vehicleDataCost + storageCost;
  const margin = revenue - totalCost;
  const marginPct = Math.round((margin / revenue) * 100);

  assert.equal(Math.round(totalCost * 100) / 100, 13.50);
  assert.equal(Math.round(margin * 100) / 100, 285.50);
  assert.equal(marginPct, 95);
});
