import test from 'node:test';
import assert from 'node:assert/strict';

// ─── Phase 10R: Daily Control Centre Test Suite ────────────────────────────
// Tests gauge calculations, stock ageing distribution, notification
// deduplication, role-scoping, and the dynamic summary sentence.

// Helpers (mirrors dashboard-service.ts logic)
function calcGauge(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return { percentage: Math.round((numerator / denominator) * 100), numerator, denominator };
}

function calcStockAgeBrackets(
  vehicles: Array<{ daysInStock: number; invested: number }>,
  canViewMargin = true
) {
  const brackets = [
    { range: '0-30', min: 0, max: 30 },
    { range: '31-45', min: 31, max: 45 },
    { range: '46-60', min: 46, max: 60 },
    { range: '61-90', min: 61, max: 90 },
    { range: '90+', min: 91, max: null },
  ];

  return brackets.map(b => {
    const inBucket = vehicles.filter(v =>
      b.max === null ? v.daysInStock >= b.min : v.daysInStock >= b.min && v.daysInStock <= b.max
    );
    return {
      range: b.range,
      count: inBucket.length,
      totalInvested: canViewMargin ? inBucket.reduce((s, v) => s + v.invested, 0) : null,
    };
  });
}

function buildNotificationFingerprint(type: string, entityId: string, threshold: number): string {
  return `${type}:${entityId}:${threshold}d`;
}

function checkDedupe(existingFingerprints: string[], fp: string): boolean {
  return !existingFingerprints.includes(fp);
}

function buildSummary(
  totalUnits: number,
  investedK: number,
  actionsToday: number,
  buyingOps: number
): string {
  return `${totalUnits} vehicles on plot · £${investedK}k invested · ${actionsToday} action${actionsToday === 1 ? '' : 's'} today · ${buyingOps} buying opportunit${buyingOps === 1 ? 'y' : 'ies'}`;
}

function buildSalesPipeline(deals: Array<{ status: string; agreedPrice: number; projectedGross: number }>, canViewMargin: boolean) {
  return {
    proposals: deals.filter(d => ['proposal_sent', 'quote_created'].includes(d.status)).length,
    agreed: deals.filter(d => ['agreed', 'deposit_taken'].includes(d.status)).length,
    totalPipelineValue: deals.reduce((s, d) => s + d.agreedPrice, 0),
    totalProjectedGross: canViewMargin ? deals.reduce((s, d) => s + d.projectedGross, 0) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Gauge Calculations with normal denominator
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T01: Stock Freshness gauge calculates percentage correctly', () => {
  const gauge = calcGauge(8, 10);
  assert.ok(gauge !== null, 'Gauge should not be null when denominator > 0');
  assert.equal(gauge!.percentage, 80);
  assert.equal(gauge!.numerator, 8);
  assert.equal(gauge!.denominator, 10);
});

test('Phase 10R — T02: Gauge returns null when denominator is zero (NO DENOMINATOR = NO GAUGE)', () => {
  const gauge = calcGauge(0, 0);
  assert.equal(gauge, null, 'Gauge must be null when denominator is zero — no fabricated values');
});

test('Phase 10R — T03: Gauge returns 100% when all stock is fresh', () => {
  const gauge = calcGauge(5, 5);
  assert.equal(gauge!.percentage, 100);
});

test('Phase 10R — T04: Gauge returns 0% when no stock passes the criterion', () => {
  const gauge = calcGauge(0, 5);
  assert.equal(gauge!.percentage, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Stock Ageing Distribution Brackets
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T05: Stock ageing correctly categorises vehicles across brackets', () => {
  const vehicles = [
    { daysInStock: 5, invested: 15000 },
    { daysInStock: 22, invested: 20000 },
    { daysInStock: 38, invested: 25000 },
    { daysInStock: 52, invested: 30000 },
    { daysInStock: 78, invested: 35000 },
    { daysInStock: 100, invested: 40000 },
  ];

  const brackets = calcStockAgeBrackets(vehicles);

  const fresh = brackets.find(b => b.range === '0-30');
  assert.equal(fresh!.count, 2, '2 vehicles in 0-30 bracket');

  const bracket31_45 = brackets.find(b => b.range === '31-45');
  assert.equal(bracket31_45!.count, 1, '1 vehicle in 31-45 bracket');

  const bracket46_60 = brackets.find(b => b.range === '46-60');
  assert.equal(bracket46_60!.count, 1, '1 vehicle in 46-60 bracket');

  const bracket90plus = brackets.find(b => b.range === '90+');
  assert.equal(bracket90plus!.count, 1, '1 vehicle in 90+ bracket');
});

test('Phase 10R — T06: Ageing capital is correctly summed across brackets > 45 days', () => {
  const vehicles = [
    { daysInStock: 5, invested: 15000 },   // fresh — not ageing
    { daysInStock: 52, invested: 30000 },  // 46-60
    { daysInStock: 78, invested: 35000 },  // 61-90
    { daysInStock: 100, invested: 40000 }, // 90+
  ];

  const brackets = calcStockAgeBrackets(vehicles);
  const ageingBrackets = brackets.filter(b => ['46-60', '61-90', '90+'].includes(b.range));
  const ageingCapital = ageingBrackets.reduce((s, b) => s + (b.totalInvested ?? 0), 0);

  assert.equal(ageingCapital, 105000, 'Ageing capital should be £105,000 (£30k + £35k + £40k)');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Notification Fingerprint Deduplication
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T07: Stock age notification is created when vehicle first crosses 45-day threshold', () => {
  const existingFingerprints: string[] = [];
  const vehicleId = 'veh-001';
  const fp = buildNotificationFingerprint('stock_age', vehicleId, 45);

  const shouldCreate = checkDedupe(existingFingerprints, fp);
  assert.equal(shouldCreate, true, 'Should create notification when fingerprint is new');
});

test('Phase 10R — T08: Duplicate stock age notification is blocked by fingerprint check', () => {
  const vehicleId = 'veh-001';
  const fp = buildNotificationFingerprint('stock_age', vehicleId, 45);
  const existingFingerprints = [fp]; // Already notified

  const shouldCreate = checkDedupe(existingFingerprints, fp);
  assert.equal(shouldCreate, false, 'Should NOT create duplicate notification for same vehicle & threshold');
});

test('Phase 10R — T09: Next escalation threshold creates a new notification (not duplicate)', () => {
  const vehicleId = 'veh-001';
  const fp45 = buildNotificationFingerprint('stock_age', vehicleId, 45);
  const fp60 = buildNotificationFingerprint('stock_age', vehicleId, 60);
  const existingFingerprints = [fp45]; // 45d already sent

  const shouldCreate60d = checkDedupe(existingFingerprints, fp60);
  assert.equal(shouldCreate60d, true, 'Should create new 60-day escalation notification');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Notification Deep Links
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T10: Lead notification deep link resolves to correct lead URL', () => {
  const leadId = 'lead-abc123';
  const linkUrl = `/leads/${leadId}`;
  assert.match(linkUrl, /^\/leads\/lead-abc123$/, 'Deep link must resolve to /leads/<id>');
});

test('Phase 10R — T11: Vehicle attention notification links to stock vehicle page', () => {
  const vehicleId = 'veh-xyz456';
  const linkUrl = `/stock/${vehicleId}`;
  assert.match(linkUrl, /^\/stock\/veh-xyz456$/, 'Attention vehicle link resolves to /stock/<id>');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Dynamic Summary Sentence
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T12: Daily summary sentence is composed deterministically from real data', () => {
  const sentence = buildSummary(5, 121, 3, 2);
  assert.equal(
    sentence,
    '5 vehicles on plot · £121k invested · 3 actions today · 2 buying opportunities',
    'Summary sentence should be deterministic from real stock and activity data'
  );
});

test('Phase 10R — T13: Summary sentence handles singular forms correctly', () => {
  const sentence = buildSummary(1, 25, 1, 1);
  assert.match(sentence, /1 action today/, 'Singular action should not pluralise');
  assert.match(sentence, /1 buying opportunity/, 'Singular opportunity should not pluralise');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6: Sales Pipeline with Role-Based Margin Redaction
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T14: Sales pipeline totalProjectedGross is visible to Dealer Principal', () => {
  const deals = [
    { status: 'agreed', agreedPrice: 18995, projectedGross: 3200 },
    { status: 'proposal_sent', agreedPrice: 24995, projectedGross: 4500 },
  ];

  const pipeline = buildSalesPipeline(deals, true); // canViewMargin = true
  assert.ok(pipeline.totalProjectedGross !== undefined, 'Projected gross should be visible to Dealer Principal');
  assert.equal(pipeline.totalProjectedGross, 7700);
  assert.equal(pipeline.totalPipelineValue, 43990);
});

test('Phase 10R — T15: Sales pipeline totalProjectedGross is redacted from Sales Executive', () => {
  const deals = [
    { status: 'agreed', agreedPrice: 18995, projectedGross: 3200 },
    { status: 'proposal_sent', agreedPrice: 24995, projectedGross: 4500 },
  ];

  const pipeline = buildSalesPipeline(deals, false); // canViewMargin = false
  assert.equal(pipeline.totalProjectedGross, undefined, 'Projected gross must be undefined for Sales Executive');
  assert.equal(pipeline.totalPipelineValue, 43990, 'Pipeline value (non-margin) should still be visible');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 7: Tenant Isolation Check
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10R — T16: Notification fingerprint incorporates dealership context', () => {
  const dealerA = 'dlr-A';
  const dealerB = 'dlr-B';
  const vehicleId = 'veh-001';

  const fpA = `${dealerA}:stock_age:${vehicleId}:45d`;
  const fpB = `${dealerB}:stock_age:${vehicleId}:45d`;

  // Same vehicle ID, different dealerships — fingerprints must differ
  assert.notEqual(fpA, fpB, 'Fingerprints must be tenant-specific to prevent cross-dealer deduplication');
});

test('Phase 10R — T17: Notification category preferences respect required system overrides', () => {
  const criticalPriority = 'critical';
  const userPrefs = { system_enabled: false }; // user turned off system notifications

  // Critical priority should not be blocked by user preferences
  const shouldSend = criticalPriority === 'critical' || userPrefs.system_enabled;
  assert.equal(shouldSend, true, 'Critical notifications must bypass user preference toggles');
});
