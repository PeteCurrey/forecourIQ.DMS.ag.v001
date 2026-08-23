# ForecourIQ DMS — Billing & Entitlements Architecture

> **Audience**: Engineering, Finance, Platform Operations  
> **Version**: Phase 9  
> **Classification**: Commercial & Technical Specification

---

## 1. Commercial Tier Matrix

ForecourIQ DMS is structured across three subscription plans:

| Capability | Starter Plan | Professional Plan | Elite Plan |
|---|---|---|---|
| **Monthly Price (GBP)** | £149 / mo | £299 / mo | £499 / mo |
| **Max Active Stock** | 20 Vehicles | 100 Vehicles | **Unlimited** |
| **Max Team Members** | 3 Users | 10 Users | **Unlimited** |
| **Forecourt Locations** | 1 Location | Up to 3 Sites | Up to 10 Sites |
| **Dealer Website** | Included | Included | Included |
| **IQ Operating Layer** | Disabled | **Included** | **Included** |
| **Competitor Tracking** | Disabled | Included | Included |
| **Accounting Sync** | Disabled | Included | Included |
| **API Access** | Disabled | Disabled | **Full Access** |
| **Support SLA** | Standard (48h) | Priority (24h) | Dedicated Account Mgr |

---

## 2. Entitlement Enforcement Rules

Entitlements are calculated in real time via `BillingService`:

### Stock Entitlement (`BillingService.checkStockEntitlement`)
- **Active stock count**: Vehicles excluding status in `['sold', 'completed', 'archived']`.
- **Soft warning threshold**: $\ge 85\%$ of plan capacity (triggers advisory toast in UI).
- **Hard gate**: $100\%$ capacity reached. Blocks new vehicle creation and CSV imports.

### User Entitlement (`BillingService.checkUserEntitlement`)
- **Active team count**: Profiles with `is_active = true`.
- **Hard gate**: Blocks staff invitation generation until tier upgrade or inactive user deactivation.

---

## 3. Stripe Customer Portal

Dealership Principals manage payment methods, VAT numbers, invoices, and plan upgrades via Stripe Billing Portal (`/settings/billing` $\rightarrow$ `POST /api/billing/portal`).

```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: dealership.stripe_customer_id,
  return_url: `${appUrl}/settings/billing`,
});
```

---

## 4. Payment Failure & Grace Periods

When a recurring charge fails:
1. `subscriptions.status` transitions to `past_due`.
2. A 14-day grace period is initiated (`grace_period_ends_at = NOW() + 14 DAYS`).
3. If unpaid after grace period, dealership transitions to `suspended` status.
