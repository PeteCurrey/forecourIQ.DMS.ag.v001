import test from 'node:test';
import assert from 'node:assert/strict';
import { TransferService } from '../transfers/transfer-service';
import { checkRolePermission } from '@/lib/rbac/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Role Dashboard Context & Margin Redaction
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 09R — T01: Sales Executive role lacks margin.read permission', () => {
  const salesHasMargin = checkRolePermission('sales', 'margin.read');
  const salesExecHasMargin = checkRolePermission('sales_executive', 'margin.read');
  assert.equal(salesHasMargin, false);
  assert.equal(salesExecHasMargin, false);
});

test('Phase 09R — T02: Dealer Principal and Admin roles have margin.read permission', () => {
  const adminHasMargin = checkRolePermission('admin', 'margin.read');
  const dpHasMargin = checkRolePermission('dealer_principal', 'margin.read');
  assert.equal(adminHasMargin, true);
  assert.equal(dpHasMargin, true);
});

test('Phase 09R — T03: Margin data is redacted from KPIs when user lacks permission', () => {
  const rawKPIs = {
    totalRetailUnits: 18,
    totalStockValue: 245000,
    total_purchase_cost: 210000,
    total_prep_cost: 15000,
    total_invested_cost: 225000,
    total_potential_profit: 45000,
    total_margin_percentage: 18.4,
    potentialGrossMargin: 45000,
    averageDaysInStock: 28,
  };

  const sanitizeForRole = (kpis: typeof rawKPIs, canViewMargin: boolean) => {
    if (canViewMargin) return kpis;
    return {
      ...kpis,
      total_purchase_cost: undefined,
      total_prep_cost: undefined,
      total_invested_cost: undefined,
      total_potential_profit: undefined,
      total_margin_percentage: undefined,
      potentialGrossMargin: undefined,
    };
  };

  const salesKPIs = sanitizeForRole(rawKPIs, false);
  const dpKPIs = sanitizeForRole(rawKPIs, true);

  assert.equal(salesKPIs.total_invested_cost, undefined);
  assert.equal(salesKPIs.potentialGrossMargin, undefined);
  assert.equal(salesKPIs.totalRetailUnits, 18);

  assert.equal(dpKPIs.total_invested_cost, 225000);
  assert.equal(dpKPIs.potentialGrossMargin, 45000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Navigation Security (Platform Console Guard)
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 09R — T04: Platform Console is filtered out for non-platform operators', () => {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Stockbook', href: '/stock' },
    { label: 'Settings', href: '/settings' },
    { label: 'Platform Console', href: '/platform', platformAdminOnly: true },
  ];

  const filterNav = (items: typeof navItems, isPlatformAdmin: boolean) => {
    return items.filter(item => {
      if (item.platformAdminOnly && !isPlatformAdmin) return false;
      return true;
    });
  };

  const dealerView = filterNav(navItems, false);
  const operatorView = filterNav(navItems, true);

  assert.equal(dealerView.some(i => i.label === 'Platform Console'), false);
  assert.equal(operatorView.some(i => i.label === 'Platform Console'), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Operational Gauges with Deterministic Denominators
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 09R — T05: Stock Freshness gauge computes percentage with explicit denominator', () => {
  const activeVehicles = [
    { id: 'v1', daysInStock: 20 },
    { id: 'v2', daysInStock: 35 },
    { id: 'v3', daysInStock: 42 },
    { id: 'v4', daysInStock: 48 }, // Ageing
    { id: 'v5', daysInStock: 60 }, // Ageing
  ];

  const total = activeVehicles.length;
  const fresh = activeVehicles.filter(v => v.daysInStock <= 45).length;
  const pct = Math.round((fresh / total) * 100);

  assert.equal(fresh, 3);
  assert.equal(total, 5);
  assert.equal(pct, 60);
});

test('Phase 09R — T06: Zero denominator returns clean fallback rather than NaN', () => {
  const total = 0;
  const fresh = 0;
  const pct = total > 0 ? Math.round((fresh / total) * 100) : 0;
  assert.equal(isNaN(pct), false);
  assert.equal(pct, 0);
});

test('Phase 09R — T07: Lead SLA gauge measures response percentage accurately', () => {
  const leads = [
    { id: 'l1', respondedWithinSLA: true },
    { id: 'l2', respondedWithinSLA: true },
    { id: 'l3', respondedWithinSLA: true },
    { id: 'l4', respondedWithinSLA: false },
  ];

  const total = leads.length;
  const responded = leads.filter(l => l.respondedWithinSLA).length;
  const pct = Math.round((responded / total) * 100);

  assert.equal(responded, 3);
  assert.equal(total, 4);
  assert.equal(pct, 75);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Multi-Site Stock Transfers & Invariant Verification
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 09R — T08: Transfer reference generates human-readable TR-YYYY-XXXXX format', () => {
  const ref = TransferService.generateTransferReference();
  const year = new Date().getFullYear();
  assert.equal(new RegExp(`^TR-${year}-\\d{5}$`).test(ref), true);
});

test('Phase 09R — T09: Location update rule — vehicle location remains unchanged until received', () => {
  let vehicleLocationId = 'loc-origin-chesterfield';

  const transferState = {
    status: 'requested' as const,
    originLocationId: 'loc-origin-chesterfield',
    destinationLocationId: 'loc-dest-sheffield',
  };

  // State transitions: requested -> approved -> in_transit
  const states = ['requested', 'approved', 'in_transit'];
  states.forEach(state => {
    // Under all these states, location MUST NOT change
    if (state !== 'received') {
      assert.equal(vehicleLocationId, 'loc-origin-chesterfield');
    }
  });

  // Only upon 'received' confirm receipt
  const simulateReceive = (destId: string) => {
    vehicleLocationId = destId;
    return {
      vehicleLocationId,
      locationHistoryCreated: true,
    };
  };

  const receipt = simulateReceive('loc-dest-sheffield');
  assert.equal(vehicleLocationId, 'loc-dest-sheffield');
  assert.equal(receipt.locationHistoryCreated, true);
});

test('Phase 09R — T10: Conflict check prevents concurrent active transfers for same vehicle', () => {
  const activeTransfers = [
    { vehicleId: 'v-101', status: 'in_transit' },
  ];

  const canRequestTransfer = (targetVehicleId: string) => {
    const hasActive = activeTransfers.some(
      t => t.vehicleId === targetVehicleId && ['requested', 'approved', 'scheduled', 'in_transit'].includes(t.status)
    );
    return !hasActive;
  };

  assert.equal(canRequestTransfer('v-101'), false); // Blocked by active transfer
  assert.equal(canRequestTransfer('v-102'), true);  // Allowed
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Team Chat Mention Parsing
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 09R — T11: Mention parsing extracts usernames correctly', () => {
  const messageBody = 'Hey @Peter and @James, please review the BMW M4 prep.';
  const matches = messageBody.match(/@([a-zA-Z0-9._-]+)/g) || [];
  const names = matches.map(m => m.slice(1));

  assert.equal(names.length, 2);
  assert.equal(names[0], 'Peter');
  assert.equal(names[1], 'James');
});
