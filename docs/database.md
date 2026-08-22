# ForecourtIQ DMS — Database & Domain Model

## 1. Overview & Conventions

ForecourtIQ uses PostgreSQL managed via Supabase. All primary keys are UUIDs (`gen_random_uuid()`). Financial numbers use high-precision decimals (`numeric(10,2)` or `numeric(12,2)`) to avoid floating-point rounding errors. Timestamps use `timestamptz` with `default now()`.

## 2. Canonical Domain Schemas

### Organisation & RBAC
- `dealerships`: Core tenant root entity. Contains company details, subscription status, VAT/FCA numbers, and website API keys.
- `dealership_locations`: Multi-site dealership addresses and contact information.
- `profiles`: User account details bound to `auth.users(id)` and `dealership_id`.
- `roles`: Canonical system roles (`dealer_principal`, `sales_manager`, `sales_executive`, `buyer`, `finance_compliance`, `marketing`, `read_only`).
- `permissions`: Fine-grained permission keys (`stock.read`, `stock.create`, `deals.approve_discount`, `finance.manage`, etc.).
- `role_permissions`: System mappings between roles and permissions.
- `user_roles`: Dealership-scoped user role assignments.

### Customers
- `customers`: Durable customer relationships containing contact info, address, consent status, and lifetime notes.
- Separate from transient `leads`.

### Vehicles & Stock
- `vehicles`: First-class vehicle entity with lifecycle statuses, UK specifications, MOT expiry, acquisition costs, and retail prices.
- `vehicle_images`: Multi-image metadata referencing Supabase Storage paths with explicit sort order and primary image flag.
- `vehicle_costs`: Granular cost tracking (acquisition, prep, transport, mechanical, valeting, warranty, advertising).

### CRM & Leads
- `leads`: Inbound enquiries and opportunities linked to vehicles and durable customers.
- `activities`: Timestamped communication timeline (calls, emails, test drives, system notes).

### Deals Desk
- `deals`: Sales orders, structured financing, discounts, deposits, part-exchange allowance, and gross profit margin.

### Platform & Intelligence
- `audit_log`: Immutable operational audit trail for price changes, status updates, permissions, and entity modifications.
- `webhook_events`: Idempotent incoming webhook event log (Stripe, advertising portals).
- `ai_runs`: Audit telemetry for every AI execution (capability, purpose, token usage, latency, error state).
- `integrations`: Dealership external provider configuration and connection statuses.
- `buying_signals` & `market_data`: Sourcing recommendations and regional demand observations.

## 3. Migration Roadmap
- `001_schema.sql`: Initial prototype tables.
- `002_phase0_foundation.sql`: Phase 0 v2 domain expansion, missing `part_ex_mileage` patch, RBAC, customers, deals, vehicle images/costs, audit logging, webhook events, and RLS policies.
- `003_rbac_seed.sql`: Seed data for 8 canonical roles, 30 fine-grained permissions, and default role-permission assignments.
