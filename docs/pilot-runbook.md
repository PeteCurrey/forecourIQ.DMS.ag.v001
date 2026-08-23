# ForecourIQ DMS — Pilot Runbook

> **Audience**: ForecourIQ Platform Operators  
> **Version**: Phase 9  
> **Classification**: Internal Operational

---

## 1. Pre-Pilot Checklist (Operator Steps)

Before activating any dealer pilot, the operator must verify all of the following:

| # | Check | How to Verify |
|---|-------|--------------|
| 1 | Dealership legal details configured | `/platform` → dealership row → lifecycle = onboarding |
| 2 | At least one active admin user | `/platform` → view dealership → user_count ≥ 1 |
| 3 | Subscription active or trial valid | `/platform` → subscription_status = trial or active |
| 4 | Go-Live evaluation score ≥ 70 | Run `OnboardingService.evaluateGoLiveReadiness(id)` |
| 5 | Primary location recorded | Check `dealership_locations` table has ≥ 1 row |
| 6 | No critical open support cases | `/platform` → open_support_cases = 0 |

---

## 2. Starting a Pilot (START PILOT)

1. Navigate to `/platform` as a verified platform operator.
2. Find the dealership in the directory.
3. Click **▶ Start Pilot**.
4. Add any notes (e.g. "90-day pilot, approved by Peter C.").
5. Click **Confirm — Start Pilot**.

The system will:
- Run `evaluateGoLiveReadiness()` automatically
- Reject if any hard blockers remain
- Update `dealerships.lifecycle_status = 'pilot'`
- Log the action to `platform_audit_logs` and `security_events`

---

## 3. Pausing a Pilot (PAUSE PILOT)

1. Navigate to `/platform`.
2. Find the active pilot dealership.
3. Click **⏸ Pause Pilot**.
4. Enter a reason (required — e.g. "Billing failure — payment in arrears").
5. Click **Confirm — Pause Pilot**.

The system will:
- Set `lifecycle_status = 'suspended'`
- Record reason in `deactivation_reason`
- Log to `platform_audit_logs` and `security_events`

> **Important**: Pausing does NOT delete data. The dealership can be reactivated.

---

## 4. Monitoring Active Pilots

Check `/platform` daily for:
- `open_support_cases > 0` — triage and assign
- `lifecycle_status = suspended` — investigate cause
- System health = degraded — escalate immediately

---

## 5. Graduating to Active Subscription

After pilot period completes:
1. Confirm dealer has set up billing via Stripe
2. Update `subscriptions.status = 'active'` (or verify Stripe webhook has done so)
3. Update `dealerships.lifecycle_status = 'active'`
4. Send onboarding completion comms
5. Log action in `platform_audit_logs`

---

## 6. Incident Response (Pilot Issues)

For P0/P1 incidents during pilot:

```
1. Identify affected dealership in /platform
2. Check /api/health for system-level issues
3. Review security_events and platform_audit_logs tables
4. Pause pilot if data integrity is at risk
5. Open internal incident ticket in Notion/Linear
6. Communicate status to dealer via support case
7. Restore service and document post-mortem
```

---

## 7. Contacts

| Role | Contact |
|------|---------|
| Engineering Lead | engineering@forecouriq.co.uk |
| Operations | ops@forecouriq.co.uk |
| Support | support@forecouriq.co.uk |
