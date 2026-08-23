# ForecourIQ DMS — Phase 9 Changelog

## v9.0.0 — Production Hardening & Pilot Readiness (2026-08-23)

### New Features

#### Dealer Onboarding
- Guided `/onboarding` wizard with step-by-step checklist tracking
- Deterministic `OnboardingService.evaluateGoLiveReadiness()` scoring engine
- Real-time blocker detection with actionable remediation links
- Onboarding state persisted in `dealership_onboarding` table with RLS

#### Data Import Engine
- CSV stock import wizard at `/stock/import` with column mapping and row-level validation
- CSV customer import at `/customers/import` with strict GDPR consent safety
- **Consent Rule**: Marketing consent can NEVER be auto-set to `true` without explicit affirmative value AND a valid consent_date timestamp
- Idempotent import job tracking in `data_import_jobs` with full error download
- Batched database inserts (50 rows/batch) with partial-failure resilience

#### User Lifecycle & Invitations
- Tokenized staff invitations via `UserService.createInvitation()` with 7-day expiry
- Pre-invitation workload summary showing leads, tasks, appointments, and deals count
- Safe deactivation with mandatory work-reassignment workflow
- Prevention of deactivating the sole remaining Administrator

#### Billing & Entitlements
- Subscription domain with `dealership_plans` (Starter/Professional/Elite) and pricing
- Hard and soft limit enforcement for vehicle stock and user counts
- `/settings/billing` page showing plan entitlements, usage bars, and renewal date
- Stripe Customer Portal session generation via `POST /api/billing/portal`

#### Support System
- `/support` support ticket hub for dealers — create, view, and reply to cases
- Case categories: account, billing, stock, website, integration, CRM, deal, compliance, IQ, technical
- Priority levels: normal, high, critical
- Internal operator notes (hidden from dealer view)
- Automated status transitions on replies

#### Platform Operator Console
- `/platform` — ForecourIQ operator-only console with global metrics dashboard
- Dealership directory with lifecycle status, stock count, user count, open cases
- `START PILOT` and `PAUSE PILOT` circuit breaker controls
- Pilot start triggers deterministic Go-Live readiness check
- Platform audit log records all operator actions in `platform_audit_logs`
- Security event log for login, invitations, deactivations, and pilot changes

#### Observability & Health
- `/api/health` — database connectivity and environment validation probe
- Usage metrics tracking in `usage_metrics` (AI calls, DVLA, CAP, SMS, email, storage)
- Unit economics calculation: contribution margin, variable cost breakdown, margin %

#### Privacy & GDPR
- `GET /api/customers/[id]/gdpr-export` — full customer data export as downloadable JSON
- `POST /api/customers/[id]/gdpr-anonymise` — retention-compliant record anonymization
- Guard: Cannot anonymize customers with active commercial deals
- Role-gated access (admin, dealer_principal, compliance only)

### Database Changes (Migration 011)
- New tables: `dealership_onboarding`, `data_import_jobs`, `user_invitations`, `dealership_plans`, `subscriptions`, `platform_operators`, `platform_audit_logs`, `support_cases`, `support_messages`, `feature_flags`, `security_events`, `usage_metrics`
- New columns on `dealerships`: `lifecycle_status`, `pilot_started_at`, `pilot_owner`, `pilot_notes`, `is_demo`, `deactivation_reason`
- New columns on `profiles`: `is_active`, `deactivated_at`, `deactivated_by`, `is_platform_admin`
- All tables with full Row Level Security tenant isolation

### API Routes Added
- `GET /api/onboarding` — current onboarding state
- `GET /api/onboarding/go-live` — Go-Live readiness evaluation
- `GET/POST /api/support/cases` — list and create support cases
- `GET/PATCH /api/support/cases/[id]` — case detail and reply
- `GET /api/billing/subscription` — subscription + entitlements
- `POST /api/billing/portal` — Stripe Customer Portal session
- `GET /api/platform/overview` — global metrics + dealership directory
- `POST /api/platform/pilot` — start/pause pilot circuit breaker
- `GET /api/health` — application health probe
- `GET /api/customers/[id]/gdpr-export` — GDPR data export
- `POST /api/customers/[id]/gdpr-anonymise` — GDPR erasure

### Sidebar Navigation
- Added: Billing & Plan, Support, Dealership Setup, Platform Console

### Tests
- Phase 9 pilot readiness test suite: 22 test cases covering all critical pilot scenarios

---

## Previous Versions

See git history for v1–v8 changes.
