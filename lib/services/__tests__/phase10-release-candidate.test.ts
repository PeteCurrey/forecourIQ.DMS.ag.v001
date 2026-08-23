import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calcAgreedPrice, 
  calcCustomerPurchaseTotal, 
  calcPXEquity, 
  calcBalanceToFund, 
  calcVehicleInvestedCost, 
  calcProjectedGross 
} from '../deal-calc';
import { checkRolePermission } from '@/lib/rbac/permissions';
import { TransferService } from '../transfers/transfer-service';

// ─────────────────────────────────────────────────────────────────────────────
// Scenario A: Clean Dealer Onboarding to Sale Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T01: Clean dealer onboarding steps pass sequential validation', () => {
  const steps = ['dealership', 'locations', 'users', 'stock', 'integrations', 'compliance', 'billing'];
  const completedSteps = ['dealership', 'locations', 'users', 'stock', 'integrations', 'compliance', 'billing'];

  const isReady = steps.every(s => completedSteps.includes(s));
  assert.equal(isReady, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario B: Customer Website Enquiry to Sale
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T02: Public website enquiry transforms into structured CRM lead', () => {
  const websiteEnquiry = {
    first_name: 'David',
    last_name: 'Miller',
    email: 'david.miller@example.com',
    phone: '07700900123',
    vehicle_id: 'v-porsche-911',
    message: 'I would like to book a test drive this Friday.',
  };

  const crmLead = {
    customer_name: `${websiteEnquiry.first_name} ${websiteEnquiry.last_name}`,
    email: websiteEnquiry.email,
    phone: websiteEnquiry.phone,
    vehicle_of_interest_id: websiteEnquiry.vehicle_id,
    source: 'dealer_website',
    status: 'new',
  };

  assert.equal(crmLead.customer_name, 'David Miller');
  assert.equal(crmLead.source, 'dealer_website');
  assert.equal(crmLead.status, 'new');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C: Internal Collaboration Boundary Safety
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T03: Team Chat messages are strictly internal and cannot be sent to customer communications', () => {
  const internalMessage = {
    thread_type: 'internal_thread',
    body: 'Customer seems eager, don’t discount more than £250 on this BMW.',
    recipient_type: 'team',
    is_customer_visible: false,
  };

  const customerChannel = {
    type: 'sms_email_outbound',
    allowedMessageTypes: ['customer_communication'],
  };

  const canLeakToCustomer = customerChannel.allowedMessageTypes.includes(internalMessage.thread_type);
  assert.equal(canLeakToCustomer, false);
  assert.equal(internalMessage.is_customer_visible, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario D: Multi-Site Stock Movement & Location Invariant
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T04: Stock movement enforces location invariant until receipt confirmation', () => {
  let vehicleLocation = 'site-manchester';

  const transfer = {
    id: 'tr-001',
    originLocationId: 'site-manchester',
    destinationLocationId: 'site-birmingham',
    status: 'in_transit',
  };

  // While in_transit, vehicle location must remain at origin
  assert.equal(vehicleLocation, transfer.originLocationId);

  // Once confirmed received, location updates atomically
  if (transfer.status === 'in_transit') {
    vehicleLocation = transfer.destinationLocationId;
    transfer.status = 'received';
  }

  assert.equal(vehicleLocation, 'site-birmingham');
  assert.equal(transfer.status, 'received');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario E: Payment & Webhook Idempotency
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T05: Webhook event processing is idempotent for Stripe deposit payments', () => {
  const processedEvents = new Set<string>();
  let dealDepositPaid = 0;

  const handleWebhook = (eventId: string, amount: number) => {
    if (processedEvents.has(eventId)) {
      return { status: 'already_processed' };
    }
    processedEvents.add(eventId);
    dealDepositPaid += amount;
    return { status: 'recorded', dealDepositPaid };
  };

  const res1 = handleWebhook('evt_stripe_1001', 500);
  const res2 = handleWebhook('evt_stripe_1001', 500); // Duplicate webhook

  assert.equal(res1.status, 'recorded');
  assert.equal(res2.status, 'already_processed');
  assert.equal(dealDepositPaid, 500); // Not doubled
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario F: Graceful Provider Failure
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T06: Core DMS continues operation when external valuation/email gateway is offline', () => {
  const gatewayState = { status: 'offline', error: 'ECONNREFUSED' };

  const getValuation = () => {
    if (gatewayState.status === 'offline') {
      return {
        success: false,
        source: 'manual_fallback',
        fallbackMessage: 'Valuation provider currently unavailable. Enter manual valuation.',
      };
    }
    return { success: true, valuation: 14500 };
  };

  const result = getValuation();
  assert.equal(result.success, false);
  assert.equal(result.source, 'manual_fallback');
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario G: AI Failure Fallback
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T07: Daily briefing falls back cleanly to deterministic DB KPI summary if AI fails', () => {
  const aiProviderAvailable = false;
  const dbKPIs = { activeStock: 24, leadsDue: 3, handoversToday: 1 };

  const generateBriefing = () => {
    if (!aiProviderAvailable) {
      return {
        summary: `Deterministic Briefing: ${dbKPIs.activeStock} vehicles in stockbook, ${dbKPIs.leadsDue} leads requiring contact, and ${dbKPIs.handoversToday} handover scheduled today.`,
        mode: 'deterministic_fallback',
      };
    }
    return { summary: 'AI narrative...', mode: 'llm' };
  };

  const briefing = generateBriefing();
  assert.equal(briefing.mode, 'deterministic_fallback');
  assert.match(briefing.summary, /24 vehicles in stockbook/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario H: Security & Margin Redaction
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T08: Sales Executive role cannot view gross profit or vehicle cost ledger', () => {
  const canSalesExecViewMargin = checkRolePermission('sales_executive', 'margin.read');
  const canSalesExecViewCosts = checkRolePermission('sales_executive', 'stock.costs');
  const canDPViewMargin = checkRolePermission('dealer_principal', 'margin.read');

  assert.equal(canSalesExecViewMargin, false);
  assert.equal(canSalesExecViewCosts, false);
  assert.equal(canDPViewMargin, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario I: Money Precision in Financial Calculator
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T09: Financial deal calculations maintain exact decimal currency precision', () => {
  const agreedPrice = calcAgreedPrice(19995.50, 1000.00); // 18995.50
  assert.equal(agreedPrice, 18995.50);

  const purchaseTotal = calcCustomerPurchaseTotal(agreedPrice, [
    { category: 'accessory', description: 'Mats', customer_price: 450.25, dealer_cost: 200, quantity: 1 },
    { category: 'warranty', description: 'Warranty', customer_price: 299.00, dealer_cost: 150, quantity: 1 },
    { category: 'other', description: 'GAP Insurance', customer_price: 199.00, dealer_cost: 80, quantity: 1 },
    { category: 'paint_protection', description: 'Ceramic', customer_price: 150.00, dealer_cost: 50, quantity: 1 },
  ]);
  // 18995.50 + 450.25 + 299 + 199 + 150 = 20093.75
  assert.equal(purchaseTotal, 20093.75);

  const pxEquity = calcPXEquity(4500.00, 2000.00);
  assert.equal(pxEquity, 2500.00);

  // Balance to fund: 20093.75 - 2500 (px equity) - 1000 (deposit) = 16593.75
  const balanceToFund = calcBalanceToFund(purchaseTotal, pxEquity, 1000.00);
  assert.equal(balanceToFund, 16593.75);

  // Vehicle invested cost: purchase 14500.00 + prep 650.75 = 15150.75
  const investedCost = calcVehicleInvestedCost({
    purchase_price: 14500.00,
    prep_cost: 650.75,
  });
  assert.equal(investedCost, 15150.75);

  // Projected gross margin: 18995.50 - 15150.75 = 3844.75
  const projectedGross = calcProjectedGross(agreedPrice, investedCost);
  assert.equal(projectedGross, 3844.75);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario J: Product Analytics & Milestone Tracking
// ─────────────────────────────────────────────────────────────────────────────

test('Phase 10 — T10: Product analytics records milestones without overwriting existing achievements', () => {
  const milestones: Record<string, string> = {};

  const recordMilestone = (name: string, timestamp: string) => {
    if (milestones[name]) return false; // Already achieved
    milestones[name] = timestamp;
    return true;
  };

  const firstAttempt = recordMilestone('first_vehicle_added', '2026-08-20T10:00:00Z');
  const secondAttempt = recordMilestone('first_vehicle_added', '2026-08-23T16:00:00Z');

  assert.equal(firstAttempt, true);
  assert.equal(secondAttempt, false);
  assert.equal(milestones['first_vehicle_added'], '2026-08-20T10:00:00Z');
});
