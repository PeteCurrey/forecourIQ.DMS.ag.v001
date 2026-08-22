# ForecourtIQ DMS — Security Architecture

## 1. Security Principles

1. **Deterministic Multi-Tenancy**: Data isolation is enforced in PostgreSQL using Row Level Security (RLS). Cross-tenant queries are blocked at the engine level.
2. **No Client-Side Secrets**: Service-role keys and sensitive credentials are never delivered to or executed from the browser.
3. **Strict RBAC**: Role and permission checks are enforced centrally via `lib/rbac/permissions.ts` and RLS.
4. **Comprehensive Auditing**: Critical operational changes (prices, user roles, deal discounts, status updates) write immutable records to `audit_log`.
5. **No Fake Backdoors**: All demo provisioning endpoints and hardcoded user credentials have been removed.

## 2. Row Level Security Model

Every tenant-owned table implements RLS using the secure helper function `get_dealership_id()`:

```sql
create or replace function get_dealership_id()
returns uuid as $$
  select dealership_id from profiles
  where id = auth.uid()
$$ language sql security definer stable;
```

Policies explicitly isolate:
- `dealerships`
- `dealership_locations`
- `vehicles`, `vehicle_images`, `vehicle_costs`
- `customers`
- `leads`, `activities`
- `deals`
- `audit_log`, `ai_runs`
- `integrations`

## 3. Public Dealer Website API Security

Public dealer website endpoints (`/api/vehicles`, `/api/leads`, `/api/dealership`) authenticate using a unique `x-api-key` header mapped to `dealerships.api_key`.
- Read routes only return public, non-sensitive stock details (filtered by `status = 'available'`).
- Write routes (lead capture) validate inputs strictly using Zod before creating records in the database.
- Private DMS records (purchase price, supplier name, prep costs, internal profit margins) are never exposed.

## 4. Phase 0 Security Remediations

- **Disabled `/api/auth/demo-provision`**: Prevented unauthenticated user creation and privilege escalation via service-role keys.
- **Removed Hardcoded Credentials**: Purged plain-text passwords and demo credentials from the login UI DOM.
- **Protected Onboarding Route**: Added dealership ownership verification to prevent cross-tenant metadata tampering during onboarding.
- **Typed Environment Guard**: Implemented `lib/config/env.ts` to halt startup if required secrets are absent.
