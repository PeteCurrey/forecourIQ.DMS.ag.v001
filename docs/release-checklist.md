# ForecourIQ v1.0 Release Candidate Checklist

This checklist defines the release gates required to promote `1.0.0-rc.1` to general availability.

---

## 1. Code & Build Quality
- [x] Full TypeScript typecheck passes with 0 errors (`npm run typecheck`).
- [x] All automated domain unit & integration tests pass (`npm test`).
- [x] Clean Next.js 16 production build (`npm run build`).
- [x] Zero unresolved P0/P1 defects in issue triage.
- [x] No development-only debug mocks in production execution paths.

## 2. Data Integrity & Security
- [x] Multi-tenant RLS policies verified across all tables (`auth_dealership_id()`).
- [x] Platform Operator console routes guarded against non-operator access.
- [x] Financial calculation precision verified (no floating-point rounding errors).
- [x] Gross margin data strictly redacted from unauthorized roles (`sales_executive`).
- [x] Stock movement location invariant verified (`vehicles.location_id` only updates on confirmed receipt).

## 3. Operations & Reliability
- [x] Health probe endpoint operational (`/api/health`).
- [x] Pilot circuit breaker & pause controls operational in Platform Console.
- [x] Database disaster recovery runbook documented (`/docs/disaster-recovery.md`).
- [x] Incident response protocols documented (`/docs/incident-response.md`).
- [x] In-app dealer feedback triage queue linked to release candidate.

## 4. Commercial & Onboarding
- [x] Self-service dealer onboarding wizard (`/onboarding`) with Go-Live evaluator.
- [x] CSV stock & customer import with pre-validation and row-level error reporting.
- [x] Stripe subscription tiers and feature entitlement checks enforced server-side.
- [x] Pilot success criteria established for all 4 pilot dealership profiles.

---

## Release Candidate Decision
**Status**: `FORECOURTIQ v1.0 RELEASE CANDIDATE READY`  
**Signed off by**: ForecourIQ Engineering Team  
**Version**: `1.0.0-rc.1`  
