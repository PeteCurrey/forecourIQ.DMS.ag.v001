-- ============================================================================
-- FORECOURTIQ DMS — PHASE 0 DATABASE MIGRATION (002_phase0_foundation.sql)
-- Canonical DMS v2 Domain Model Foundation
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------

-- Canonical Vehicle Statuses
do $$ begin
  create type vehicle_status as enum (
    'acquiring',
    'purchased',
    'in_transit',
    'arrived',
    'inspection',
    'preparation',
    'photography',
    'ready_for_sale',
    'available',
    'advertised',
    'reserved',
    'sold',
    'handover',
    'completed',
    'returned',
    'wholesale',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- Integration Statuses
do $$ begin
  create type integration_status_type as enum (
    'available',
    'connected',
    'disconnected',
    'error',
    'credentials_required',
    'commercial_agreement_required',
    'not_available',
    'not_yet_implemented'
  );
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 2. SCHEMA PATCHES TO EXISTING TABLES
-- ----------------------------------------------------------------------------

-- Add missing part_ex_mileage to leads table (resolving schema inconsistency)
alter table leads add column if not exists part_ex_mileage integer;
alter table leads add column if not exists customer_id uuid;

-- ----------------------------------------------------------------------------
-- 3. ORGANISATION & RBAC FOUNDATION
-- ----------------------------------------------------------------------------

-- Dealership Locations (Multi-site foundation)
create table if not exists dealership_locations (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  name text not null,
  slug text not null,
  address_line1 text,
  address_line2 text,
  city text,
  county text,
  postcode text,
  phone text,
  email text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(dealership_id, slug)
);

-- Roles table
create table if not exists roles (
  id text primary key, -- e.g. 'dealer_principal', 'sales_manager', 'sales_executive'
  name text not null,
  description text,
  is_system boolean default true,
  created_at timestamptz default now()
);

-- Permissions table
create table if not exists permissions (
  id text primary key, -- e.g. 'stock.read', 'stock.create', 'deals.read'
  category text not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Role-Permissions mapping
create table if not exists role_permissions (
  role_id text not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- User-Roles mapping (scoped to dealership)
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references roles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(dealership_id, user_id, role_id)
);

-- ----------------------------------------------------------------------------
-- 4. CUSTOMER DOMAIN FOUNDATION
-- ----------------------------------------------------------------------------

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  county text,
  postcode text,
  marketing_consent boolean default false,
  marketing_consent_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Link existing leads to customers where available
alter table leads drop constraint if exists fk_leads_customer;
alter table leads add constraint fk_leads_customer foreign key (customer_id) references customers(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 5. DEALS DOMAIN FOUNDATION
-- ----------------------------------------------------------------------------

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  deal_number serial,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  salesperson_id uuid references profiles(id) on delete set null,
  status text not null default 'draft', -- 'draft', 'pending_approval', 'deposit_paid', 'finance_approved', 'invoicing', 'completed', 'cancelled'
  sale_price numeric(12,2) not null default 0,
  discount_amount numeric(10,2) default 0,
  discount_approved_by uuid references profiles(id),
  part_ex_vehicle_id uuid references vehicles(id) on delete set null,
  part_ex_allowance numeric(10,2) default 0,
  deposit_amount numeric(10,2) default 0,
  deposit_paid_at timestamptz,
  payment_method text,
  finance_type text, -- 'hp', 'pcp', 'bch', 'cash'
  finance_amount numeric(12,2) default 0,
  gross_margin numeric(10,2),
  handover_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 6. VEHICLE IMAGES & DETAILED COSTS (Moving away from flat arrays)
-- ----------------------------------------------------------------------------

create table if not exists vehicle_images (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  storage_path text not null,
  url text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  sort_order integer default 0,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create table if not exists vehicle_costs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  category text not null, -- 'purchase', 'prep', 'transport', 'cosmetic', 'mechanical', 'mot', 'valeting', 'warranty', 'advertising', 'other'
  description text,
  amount numeric(10,2) not null,
  invoice_reference text,
  supplier_name text,
  incurred_date date default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 7. AUDIT LOGGING & PLATFORM EVENTS
-- ----------------------------------------------------------------------------

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  source text default 'web',
  ip_address text,
  created_at timestamptz default now()
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null, -- 'stripe', 'autotrader', etc.
  event_type text not null,
  external_event_id text,
  status text not null default 'pending', -- 'pending', 'processed', 'failed', 'ignored'
  payload jsonb not null,
  error_message text,
  received_at timestamptz default now(),
  processed_at timestamptz
);

create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  capability text not null, -- 'IQ_ASK', 'IQ_RECOMMEND', 'IQ_CREATE', 'IQ_ACT', 'IQ_MONITOR', 'IQ_BRIEF'
  purpose text not null,
  entity_type text,
  entity_id text,
  model text not null default 'claude-3-5-sonnet-20240620',
  provider text not null default 'anthropic',
  input_tokens integer default 0,
  output_tokens integer default 0,
  latency_ms integer default 0,
  success boolean default true,
  error_message text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  provider text not null, -- 'dvla', 'autotrader', 'stripe', 'xero', 'sendgrid', 'twilio'
  status text not null default 'credentials_required',
  credentials_encrypted text,
  settings jsonb default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(dealership_id, provider)
);

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
-- ----------------------------------------------------------------------------

alter table dealership_locations enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table customers enable row level security;
alter table deals enable row level security;
alter table vehicle_images enable row level security;
alter table vehicle_costs enable row level security;
alter table audit_log enable row level security;
alter table webhook_events enable row level security;
alter table ai_runs enable row level security;
alter table integrations enable row level security;

-- Roles & Permissions (Read-only for authenticated users)
create policy "authenticated_read_roles" on roles
  for select using (auth.role() = 'authenticated');

create policy "authenticated_read_permissions" on permissions
  for select using (auth.role() = 'authenticated');

create policy "authenticated_read_role_permissions" on role_permissions
  for select using (auth.role() = 'authenticated');

-- Dealership-scoped tables
create policy "dealership_locations_policy" on dealership_locations
  for all using (dealership_id = get_dealership_id());

create policy "user_roles_policy" on user_roles
  for all using (dealership_id = get_dealership_id());

create policy "customers_policy" on customers
  for all using (dealership_id = get_dealership_id());

create policy "deals_policy" on deals
  for all using (dealership_id = get_dealership_id());

create policy "vehicle_images_policy" on vehicle_images
  for all using (dealership_id = get_dealership_id());

create policy "vehicle_costs_policy" on vehicle_costs
  for all using (dealership_id = get_dealership_id());

create policy "audit_log_policy" on audit_log
  for select using (dealership_id = get_dealership_id());

create policy "audit_log_insert_policy" on audit_log
  for insert with check (dealership_id = get_dealership_id());

create policy "ai_runs_policy" on ai_runs
  for select using (dealership_id = get_dealership_id());

create policy "ai_runs_insert_policy" on ai_runs
  for insert with check (dealership_id = get_dealership_id());

create policy "integrations_policy" on integrations
  for all using (dealership_id = get_dealership_id());

-- Webhook events (service_role only)
create policy "service_role_webhook_events" on webhook_events
  for all using (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

create index if not exists customers_dealership_idx on customers(dealership_id, created_at desc);
create index if not exists customers_email_idx on customers(dealership_id, email);
create index if not exists customers_phone_idx on customers(dealership_id, phone);

create index if not exists deals_dealership_status_idx on deals(dealership_id, status);
create index if not exists deals_customer_idx on deals(customer_id);
create index if not exists deals_vehicle_idx on deals(vehicle_id);

create index if not exists vehicle_images_vehicle_idx on vehicle_images(vehicle_id, sort_order);
create index if not exists vehicle_costs_vehicle_idx on vehicle_costs(vehicle_id, incurred_date desc);

create index if not exists audit_log_dealership_created_idx on audit_log(dealership_id, created_at desc);
create index if not exists audit_log_entity_idx on audit_log(dealership_id, entity_type, entity_id);

create index if not exists ai_runs_dealership_created_idx on ai_runs(dealership_id, created_at desc);
create index if not exists webhook_events_status_idx on webhook_events(status, received_at desc);

-- ----------------------------------------------------------------------------
-- 10. STORAGE BUCKETS CONFIGURATION (SQL helper comments for Supabase)
-- ----------------------------------------------------------------------------
-- Bucket: vehicle-photos (public read, authenticated dealership write)
-- Bucket: dealership-branding (public read, authenticated dealership write)
-- Bucket: deal-documents (private read/write, dealership scoped)
-- Bucket: compliance-documents (private read/write, dealership scoped)
