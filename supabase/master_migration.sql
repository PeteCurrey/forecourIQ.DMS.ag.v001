-- ============================================================================
-- FORECOURTIQ DMS — COMPLETE MASTER DATABASE MIGRATION
-- Run this script in the Supabase Dashboard SQL Editor to initialize all tables,
-- RLS policies, RBAC roles/permissions, Phase 0 and Phase 1 schemas.
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. BASE SCHEMA
-- ----------------------------------------------------------------------------

-- DEALERSHIPS
create table if not exists dealerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  address_line1 text,
  address_line2 text,
  city text,
  county text,
  postcode text,
  phone text,
  email text,
  website_url text,
  vat_number text,
  fca_number text,
  ico_number text,
  logo_url text,
  primary_colour text default '#0EA5E9',
  autotrader_advertiser_id text,
  ebay_store_id text,
  subscription_tier text default 'elite',
  subscription_status text default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  api_key uuid default gen_random_uuid() unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  dealership_id uuid references dealerships on delete cascade,
  full_name text,
  role text default 'dealer_principal',
  avatar_url text,
  created_at timestamptz default now()
);

-- DEALERSHIP LOCATIONS (Multi-site)
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

-- VEHICLES
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  location_id uuid references dealership_locations(id) on delete set null,
  assigned_user_id uuid references profiles(id) on delete set null,
  registration text not null,
  vin text,
  make text not null,
  model text not null,
  variant text,
  year integer not null,
  mileage integer not null,
  colour text,
  fuel_type text,
  transmission text,
  body_type text,
  doors integer,
  engine_size text,
  co2_g_per_km integer,
  keys_count integer default 2,
  service_history text default 'unknown',
  service_history_type text,
  hpi_clear boolean default false,
  hpi_status text default 'clear',
  hpi_checked_at timestamptz,
  condition text default 'good',
  body_condition text,
  wheel_condition text,
  tyre_condition text,
  mot_expiry date,
  mot_expiry_date date,
  purchase_source text,
  supplier_name text,
  auction_house text,
  purchase_date date default current_date,
  purchase_reference text,
  funding_source text,
  purchase_price numeric(10,2) default 0,
  auction_fee numeric(10,2) default 0,
  transport_cost numeric(10,2) default 0,
  prep_cost numeric(10,2) default 0,
  other_acquisition_costs numeric(10,2) default 0,
  asking_price numeric(10,2) default 0,
  trade_value numeric(10,2),
  cap_retail numeric(10,2),
  cap_trade numeric(10,2),
  status text not null default 'available',
  description text,
  advert_headline text,
  advert_description text,
  advert_ready boolean default false,
  highlights text[],
  features text[],
  photos text[],
  primary_photo_index integer default 0,
  published_autotrader boolean default false,
  published_ebay boolean default false,
  published_cargurus boolean default false,
  published_motors boolean default false,
  published_facebook boolean default false,
  sold_price numeric(10,2),
  sold_at timestamptz,
  sold_to_lead_id uuid,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CUSTOMERS
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
  preferred_contact_method text default 'email',
  marketing_consent boolean default false,
  marketing_consent_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LEADS
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  source text not null default 'website',
  status text default 'new',
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  message text,
  notes text,
  finance_interest boolean default false,
  part_ex_reg text,
  part_ex_mileage integer,
  part_ex_value numeric(10,2),
  assigned_to uuid references profiles(id) on delete set null,
  next_followup_at timestamptz,
  last_contacted_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DEALS
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  deal_number serial,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  salesperson_id uuid references profiles(id) on delete set null,
  status text not null default 'draft',
  sale_price numeric(12,2) not null default 0,
  discount_amount numeric(10,2) default 0,
  discount_approved_by uuid references profiles(id),
  part_ex_vehicle_id uuid references vehicles(id) on delete set null,
  part_ex_allowance numeric(10,2) default 0,
  deposit_amount numeric(10,2) default 0,
  deposit_paid_at timestamptz,
  payment_method text,
  finance_type text default 'cash',
  finance_amount numeric(12,2) default 0,
  gross_margin numeric(10,2),
  handover_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- VEHICLE IMAGES
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

-- VEHICLE COSTS
create table if not exists vehicle_costs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(10,2) not null,
  invoice_reference text,
  supplier_name text,
  incurred_date date default current_date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- PREPARATION JOBS
create table if not exists preparation_jobs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  title text not null,
  category text not null default 'mechanical',
  supplier text,
  job_type text not null default 'internal',
  status text not null default 'not_started',
  estimated_cost numeric(10,2) default 0,
  actual_cost numeric(10,2) default 0,
  scheduled_date date,
  due_date date,
  completed_date date,
  assigned_to uuid references profiles(id) on delete set null,
  notes text,
  blockers text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- VEHICLE DOCUMENTS
create table if not exists vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  document_type text not null,
  filename text not null,
  storage_path text not null,
  url text,
  file_size integer,
  mime_type text,
  notes text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- VEHICLE STATUS HISTORY
create table if not exists vehicle_status_history (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- VEHICLE PRICE HISTORY
create table if not exists vehicle_price_history (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2) not null,
  reason text,
  source text default 'manual',
  changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TASKS
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'normal',
  status text not null default 'open',
  entity_type text,
  entity_id uuid,
  due_at timestamptz,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- APPOINTMENTS
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  title text not null,
  appointment_type text not null default 'vehicle_viewing',
  status text not null default 'scheduled',
  customer_id uuid references customers(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CUSTOMER CONSENT EVENTS
create table if not exists customer_consent_events (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  consent_type text not null,
  status text not null,
  source text default 'dms',
  ip_address text,
  user_agent text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ACTIVITIES
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  lead_id uuid references leads,
  vehicle_id uuid references vehicles,
  customer_id uuid references customers,
  type text not null,
  content text not null,
  created_by uuid references profiles,
  created_at timestamptz default now()
);

-- EXPENSES
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles not null,
  dealership_id uuid references dealerships not null,
  category text,
  amount numeric(10,2) not null,
  description text,
  date date default current_date,
  created_at timestamptz default now()
);

-- BUYING SIGNALS
create table if not exists buying_signals (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  generated_date date default current_date,
  make text not null,
  model text not null,
  year_min integer,
  year_max integer,
  fuel_type text,
  mileage_max integer,
  target_buy_price numeric(10,2),
  projected_retail numeric(10,2),
  projected_margin numeric(10,2),
  days_to_sell_estimate integer,
  demand_score integer,
  reasoning text,
  status text default 'active',
  dismissed_reason text,
  created_at timestamptz default now()
);

-- MARKET DATA
create table if not exists market_data (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  make text not null,
  model text not null,
  fuel_type text,
  region text default 'East Midlands',
  avg_asking_price numeric(10,2),
  avg_days_to_sell integer,
  total_listings integer,
  demand_score integer,
  recorded_date date default current_date,
  created_at timestamptz default now()
);

-- AUDIT LOG
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

-- WEBHOOK EVENTS
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  external_event_id text,
  status text not null default 'pending',
  payload jsonb not null,
  error_message text,
  received_at timestamptz default now(),
  processed_at timestamptz
);

-- AI RUNS
create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  capability text not null,
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

-- INTEGRATIONS
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  provider text not null,
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
-- 2. RBAC TABLES
-- ----------------------------------------------------------------------------

create table if not exists roles (
  id text primary key,
  name text not null,
  description text,
  is_system boolean default true,
  created_at timestamptz default now()
);

create table if not exists permissions (
  id text primary key,
  category text not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists role_permissions (
  role_id text not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references roles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(dealership_id, user_id, role_id)
);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

alter table dealerships enable row level security;
alter table profiles enable row level security;
alter table dealership_locations enable row level security;
alter table vehicles enable row level security;
alter table vehicle_images enable row level security;
alter table vehicle_costs enable row level security;
alter table preparation_jobs enable row level security;
alter table vehicle_documents enable row level security;
alter table vehicle_status_history enable row level security;
alter table vehicle_price_history enable row level security;
alter table customers enable row level security;
alter table customer_consent_events enable row level security;
alter table leads enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table appointments enable row level security;
alter table activities enable row level security;
alter table expenses enable row level security;
alter table buying_signals enable row level security;
alter table market_data enable row level security;
alter table audit_log enable row level security;
alter table webhook_events enable row level security;
alter table ai_runs enable row level security;
alter table integrations enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;

-- Helper function
create or replace function get_dealership_id()
returns uuid as $$
  select dealership_id from profiles
  where id = auth.uid()
$$ language sql security definer stable;

-- Policies
create policy "users_own_dealership" on dealerships for all using (id = get_dealership_id());
create policy "users_own_profile" on profiles for all using (id = auth.uid());
create policy "dealership_locations_policy" on dealership_locations for all using (dealership_id = get_dealership_id());
create policy "dealership_vehicles" on vehicles for all using (dealership_id = get_dealership_id());
create policy "vehicle_images_policy" on vehicle_images for all using (dealership_id = get_dealership_id());
create policy "vehicle_costs_policy" on vehicle_costs for all using (dealership_id = get_dealership_id());
create policy "preparation_jobs_policy" on preparation_jobs for all using (dealership_id = get_dealership_id());
create policy "vehicle_documents_policy" on vehicle_documents for all using (dealership_id = get_dealership_id());
create policy "vehicle_status_history_policy" on vehicle_status_history for all using (dealership_id = get_dealership_id());
create policy "vehicle_price_history_policy" on vehicle_price_history for all using (dealership_id = get_dealership_id());
create policy "customers_policy" on customers for all using (dealership_id = get_dealership_id());
create policy "customer_consent_events_policy" on customer_consent_events for all using (dealership_id = get_dealership_id());
create policy "dealership_leads" on leads for all using (dealership_id = get_dealership_id());
create policy "deals_policy" on deals for all using (dealership_id = get_dealership_id());
create policy "tasks_policy" on tasks for all using (dealership_id = get_dealership_id());
create policy "appointments_policy" on appointments for all using (dealership_id = get_dealership_id());
create policy "dealership_activities" on activities for all using (dealership_id = get_dealership_id());
create policy "dealership_expenses" on expenses for all using (dealership_id = get_dealership_id());
create policy "dealership_signals" on buying_signals for all using (dealership_id = get_dealership_id());
create policy "dealership_market" on market_data for all using (dealership_id = get_dealership_id());
create policy "audit_log_policy" on audit_log for select using (dealership_id = get_dealership_id());
create policy "audit_log_insert_policy" on audit_log for insert with check (dealership_id = get_dealership_id());
create policy "ai_runs_policy" on ai_runs for select using (dealership_id = get_dealership_id());
create policy "ai_runs_insert_policy" on ai_runs for insert with check (dealership_id = get_dealership_id());
create policy "integrations_policy" on integrations for all using (dealership_id = get_dealership_id());
create policy "user_roles_policy" on user_roles for all using (dealership_id = get_dealership_id());

-- Public / auth read roles
create policy "authenticated_read_roles" on roles for select using (auth.role() = 'authenticated');
create policy "authenticated_read_permissions" on permissions for select using (auth.role() = 'authenticated');
create policy "authenticated_read_role_permissions" on role_permissions for select using (auth.role() = 'authenticated');

-- Service role bypass policies for APIs
create policy "service_role_vehicles" on vehicles for all using (auth.role() = 'service_role');
create policy "service_role_leads" on leads for all using (auth.role() = 'service_role');
create policy "service_role_dealerships" on dealerships for all using (auth.role() = 'service_role');
create policy "service_role_profiles" on profiles for all using (auth.role() = 'service_role');
create policy "service_role_webhook_events" on webhook_events for all using (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4. ROLES & PERMISSIONS SEED
-- ----------------------------------------------------------------------------

insert into roles (id, name, description, is_system) values
  ('dealer_principal', 'Dealer Principal / Owner', 'Full control over dealership operations, settings, users, billing, and financial intelligence.', true),
  ('administrator', 'Administrator', 'Broad operational and administrative control across all dealership functions.', true),
  ('sales_manager', 'Sales Manager', 'Comprehensive management of stock, sales team, leads, customers, discounts, and deals.', true),
  ('sales_executive', 'Sales Executive', 'Management of assigned leads, customers, deals, and viewing dealership stock.', true),
  ('buyer', 'Buyer', 'Vehicle acquisition, buying intelligence, appraisals, and stock sourcing workflows.', true),
  ('finance_compliance', 'Finance / Compliance Officer', 'Finance proposals, disclosures, SAF compliance, and deal regulatory sign-offs.', true),
  ('marketing', 'Marketing', 'Stock advertising portals, feeds, website content, and customer marketing campaigns.', true),
  ('read_only', 'Read Only', 'Reporting and dashboard visibility without operational modification rights.', true)
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into permissions (id, category, name, description) values
  ('stock.read', 'stock', 'View Stock', 'View vehicle stockbook and specifications'),
  ('stock.create', 'stock', 'Add Vehicle', 'Add new vehicles to stock'),
  ('stock.update', 'stock', 'Update Vehicle', 'Edit vehicle details, pricing, and specs'),
  ('stock.delete', 'stock', 'Delete Vehicle', 'Remove vehicles from stock'),
  ('stock.costs', 'stock', 'Manage Costs', 'View and edit vehicle prep/acquisition costs'),
  ('stock.publish', 'stock', 'Publish Advertising', 'Publish vehicles to advertising portals and website'),
  ('customers.read', 'customers', 'View Customers', 'View customer database and contact details'),
  ('customers.create', 'customers', 'Create Customer', 'Add new customer records'),
  ('customers.update', 'customers', 'Update Customer', 'Edit customer information and consent'),
  ('customers.delete', 'customers', 'Delete Customer', 'Delete customer records'),
  ('leads.read', 'leads', 'View Leads', 'View incoming leads and enquiries'),
  ('leads.create', 'leads', 'Create Lead', 'Create manual lead records'),
  ('leads.update', 'leads', 'Update Lead', 'Update lead status, notes, and details'),
  ('leads.assign', 'leads', 'Assign Leads', 'Assign leads to sales executives'),
  ('leads.respond', 'leads', 'Respond to Leads', 'Send communications to lead contacts'),
  ('deals.read', 'deals', 'View Deals', 'View deal desk and sales records'),
  ('deals.create', 'deals', 'Create Deal', 'Structure new deals, deposits, and proposals'),
  ('deals.update', 'deals', 'Update Deal', 'Edit deal terms and items'),
  ('deals.approve_discount', 'deals', 'Approve Discounts', 'Approve discounts beyond salesperson limits'),
  ('deals.complete', 'deals', 'Complete Deal', 'Finalise deal and mark vehicle as sold'),
  ('finance.read', 'finance', 'View Finance', 'View finance proposals and quotes'),
  ('finance.manage', 'finance', 'Manage Finance', 'Submit and manage finance applications'),
  ('compliance.read', 'compliance', 'View Compliance', 'View compliance logs and disclosures'),
  ('compliance.manage', 'compliance', 'Manage Compliance', 'Manage FCA compliance workflows and sign-offs'),
  ('intelligence.read', 'intelligence', 'View Intelligence', 'Access AI Command Centre and market signals'),
  ('intelligence.act', 'intelligence', 'Execute AI Actions', 'Authorise AI recommendations and automated actions'),
  ('users.manage', 'system', 'Manage Users', 'Invite, modify roles, and deactivate team members'),
  ('integrations.manage', 'system', 'Manage Integrations', 'Connect and configure external service integrations'),
  ('billing.manage', 'system', 'Manage Billing', 'Manage Stripe subscription and payment methods'),
  ('settings.manage', 'system', 'Manage Settings', 'Update dealership settings, locations, and branding')
on conflict (id) do update set category = excluded.category, name = excluded.name, description = excluded.description;

insert into role_permissions (role_id, permission_id)
select 'dealer_principal', id from permissions
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 5. INITIAL DEALERSHIP & DEMO USER PROVISIONING
-- ----------------------------------------------------------------------------

insert into dealerships (
  id,
  name,
  slug,
  city,
  county,
  address_line1,
  postcode,
  subscription_tier,
  subscription_status
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Hartwell Motor Group',
  'hartwell-motor-group',
  'Chesterfield',
  'Derbyshire',
  '12-14 High Street',
  'S40 1PL',
  'elite',
  'active'
) on conflict (id) do update set name = excluded.name;

insert into dealership_locations (
  dealership_id,
  name,
  slug,
  city,
  county,
  address_line1,
  postcode,
  is_primary
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Chesterfield Main Site',
  'chesterfield-main',
  'Chesterfield',
  'Derbyshire',
  '12-14 High Street',
  'S40 1PL',
  true
) on conflict (dealership_id, slug) do nothing;

-- Link demo user profile if user exists in auth.users
insert into profiles (
  id,
  dealership_id,
  full_name,
  role
) values (
  'a09ba474-82df-4760-9158-b9fdabdf4250',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Peter Currey',
  'dealer_principal'
) on conflict (id) do update set
  dealership_id = excluded.dealership_id,
  full_name = excluded.full_name,
  role = excluded.role;

-- ----------------------------------------------------------------------------
-- 6. REALISTIC SEED VEHICLES (Initial stockbook)
-- ----------------------------------------------------------------------------

insert into vehicles (
  dealership_id,
  registration,
  make,
  model,
  variant,
  year,
  mileage,
  colour,
  fuel_type,
  transmission,
  body_type,
  purchase_price,
  prep_cost,
  transport_cost,
  asking_price,
  status,
  hpi_status,
  service_history_type,
  purchase_source,
  supplier_name,
  created_at
) values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'DN21XYZ', 'BMW', '3 Series', '330e M Sport Pro Package Saloon', 2021, 28450, 'Mineral Grey', 'Hybrid', 'Automatic', 'Saloon', 21500, 350, 180, 26995, 'available', 'clear', 'full', 'auction', 'BCA Nottingham', now() - interval '18 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'LD70AVK', 'Mercedes-Benz', 'A Class', 'A200 AMG Line Executive 5dr Auto', 2020, 34200, 'Polar White', 'Petrol', 'Automatic', 'Hatchback', 16800, 250, 150, 20995, 'available', 'clear', 'full', 'trade_purchase', 'Lookers Trade', now() - interval '12 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'KP71OWU', 'Audi', 'A4', '35 TDI Black Edition S Tronic', 2021, 31000, 'Mythos Black', 'Diesel', 'Automatic', 'Saloon', 20200, 480, 175, 25495, 'preparation', 'clear', 'full', 'auction', 'Manheim Leeds', now() - interval '5 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'YB22LKX', 'Volkswagen', 'Golf', '2.0 TSI R 4Motion 5dr DSG', 2022, 19800, 'Lapiz Blue', 'Petrol', 'Automatic', 'Hatchback', 27400, 150, 200, 32995, 'available', 'clear', 'full', 'part_exchange', 'Direct Customer', now() - interval '8 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'WN69EOP', 'Land Rover', 'Range Rover Sport', '3.0 SDV6 HSE Dynamic Auto', 2019, 44200, 'Carpathian Grey', 'Diesel', 'Automatic', 'SUV', 32000, 850, 220, 39995, 'available', 'clear', 'full', 'trade_purchase', 'Stratstone Trade', now() - interval '48 days')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 7. INITIAL TASKS & APPOINTMENTS
-- ----------------------------------------------------------------------------

insert into tasks (
  dealership_id,
  title,
  description,
  priority,
  status,
  due_at,
  assigned_to
) values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Follow up BMW 330e enquiry (James Wilson)', 'Customer requested video walkaround and finance quote for DN21XYZ.', 'high', 'open', now() + interval '2 hours', 'a09ba474-82df-4760-9158-b9fdabdf4250'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Book MOT for Audi A4 (KP71OWU)', 'MOT expires in 14 days, prep mechanical check required.', 'normal', 'open', now() + interval '1 day', 'a09ba474-82df-4760-9158-b9fdabdf4250'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Review price for Range Rover Sport (WN69EOP)', 'Vehicle is at 48 days on plot. Check regional Autotrader market pricing.', 'urgent', 'open', now() - interval '1 hour', 'a09ba474-82df-4760-9158-b9fdabdf4250')
on conflict do nothing;

insert into appointments (
  dealership_id,
  title,
  appointment_type,
  status,
  start_at,
  end_at,
  location,
  assigned_to
) values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Test Drive — BMW 330e (James Wilson)', 'test_drive', 'confirmed', now() + interval '3 hours', now() + interval '4 hours', 'Chesterfield Main Site', 'a09ba474-82df-4760-9158-b9fdabdf4250'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Vehicle Handover — Golf R (David Miller)', 'handover', 'scheduled', now() + interval '1 day', now() + interval '1 day 1 hour', 'Chesterfield Main Site', 'a09ba474-82df-4760-9158-b9fdabdf4250')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 8. INITIAL PREPARATION JOBS
-- ----------------------------------------------------------------------------

insert into preparation_jobs (
  dealership_id,
  vehicle_id,
  title,
  category,
  supplier,
  status,
  estimated_cost,
  actual_cost,
  due_date,
  assigned_to
)
select
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  id,
  'Alloy Wheel Refurbishment (Front Left & Rear Right)',
  'alloy_wheel',
  'Precision Wheels Ltd',
  'in_progress',
  160.00,
  0,
  current_date + interval '2 days',
  'a09ba474-82df-4760-9158-b9fdabdf4250'
from vehicles where registration = 'KP71OWU' limit 1;

insert into preparation_jobs (
  dealership_id,
  vehicle_id,
  title,
  category,
  supplier,
  status,
  estimated_cost,
  actual_cost,
  due_date,
  assigned_to
)
select
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  id,
  'Full Valet & Detailing',
  'valeting',
  'Internal Valet Bay',
  'scheduled',
  80.00,
  0,
  current_date + interval '3 days',
  'a09ba474-82df-4760-9158-b9fdabdf4250'
from vehicles where registration = 'KP71OWU' limit 1;

-- ============================================================================
-- PHASE 2: CRM, CONVERSATIONS, MESSAGES & CALL LOGS
-- ============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'unknown' CHECK (temperature IN ('hot', 'warm', 'cold', 'unknown')),
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web' CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'web', 'social', 'walk_in', 'internal')),
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_description text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS close_notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'new',
    'unassigned',
    'contact_attempted',
    'contacted',
    'qualified',
    'appointment_booked',
    'appointment_completed',
    'proposal_required',
    'deal_ready',
    'nurture',
    'won',
    'lost',
    'closed'
  )
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'web', 'social', 'internal')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting_customer', 'waiting_dealer', 'closed', 'archived')),
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject text,
  last_message_preview text,
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal_note')),
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'web', 'internal')),
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'customer', 'system')),
  sender_id text,
  sender_name text,
  recipient text,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'delivered' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  failed_reason text,
  external_message_id text,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number text,
  duration_seconds integer DEFAULT 0,
  outcome text NOT NULL CHECK (outcome IN ('connected', 'left_voicemail', 'no_answer', 'busy', 'wrong_number', 'call_back_requested')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_dealership_status ON public.leads(dealership_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_dealership_assigned ON public.leads(dealership_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_dealership_next_action ON public.leads(dealership_id, next_action_at);
CREATE INDEX IF NOT EXISTS idx_leads_dealership_created ON public.leads(dealership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_dealership ON public.conversations(dealership_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs(lead_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_tenant_isolation" ON public.conversations
  FOR ALL USING (dealership_id = auth_dealership_id())
  WITH CHECK (dealership_id = auth_dealership_id());

CREATE POLICY "messages_tenant_isolation" ON public.messages
  FOR ALL USING (dealership_id = auth_dealership_id())
  WITH CHECK (dealership_id = auth_dealership_id());

CREATE POLICY "call_logs_tenant_isolation" ON public.call_logs
  FOR ALL USING (dealership_id = auth_dealership_id())
  WITH CHECK (dealership_id = auth_dealership_id());

CREATE POLICY "lead_status_history_tenant_isolation" ON public.lead_status_history
  FOR ALL USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND leads.dealership_id = auth_dealership_id()));

CREATE POLICY "lead_assignment_history_tenant_isolation" ON public.lead_assignment_history
  FOR ALL USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_assignment_history.lead_id AND leads.dealership_id = auth_dealership_id()));

-- ============================================================================
-- FORECOURTIQ DMS — PHASE 3 MIGRATION: DEAL DESK, PART EXCHANGE, DEPOSITS,
-- FINANCE & HANDOVER (006_phase3_deals.sql)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND DEALS TABLE — Replace thin Phase 0 stub with full canonical schema
-- ----------------------------------------------------------------------------

-- Deal reference sequence (dealership-scoped friendly ref: FIQ-YYYY-NNNNNN)
CREATE SEQUENCE IF NOT EXISTS deal_ref_seq START 1 INCREMENT 1;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_reference text UNIQUE,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.dealership_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Commercial
  ADD COLUMN IF NOT EXISTS vehicle_retail_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agreed_vehicle_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS discounted_at timestamptz,
  -- Products/extras totals (from deal_line_items)
  ADD COLUMN IF NOT EXISTS products_total numeric(12,2) DEFAULT 0,
  -- Part exchange totals (denormalised from part_exchanges)
  ADD COLUMN IF NOT EXISTS part_exchange_total numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_exchange_settlement numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_exchange_equity numeric(12,2) DEFAULT 0,
  -- Finance/payment split
  ADD COLUMN IF NOT EXISTS cash_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash'
    CHECK (payment_method IN ('cash','bank_transfer','card','finance','mixed','other')),
  -- Deposit
  ADD COLUMN IF NOT EXISTS deposit_required numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid numeric(10,2) DEFAULT 0,
  -- Margin (actual set on completion only)
  ADD COLUMN IF NOT EXISTS gross_margin_projected numeric(12,2),
  ADD COLUMN IF NOT EXISTS gross_margin_actual numeric(12,2),
  -- Key timestamps
  ADD COLUMN IF NOT EXISTS deal_created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  -- Cancellation
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Metadata
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Remove old thin status constraint, replace with canonical 13-stage model
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_status_check CHECK (
  status IN (
    'draft','proposal','negotiation','agreed','awaiting_deposit',
    'reserved','finance_pending','documentation','pre_handover',
    'handover_ready','completed','cancelled','lost'
  )
);

-- Set existing deals to have a deal_reference if null
UPDATE public.deals
SET deal_reference = 'FIQ-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(deal_number::text, 6, '0')
WHERE deal_reference IS NULL;

-- ----------------------------------------------------------------------------
-- 2. DEAL STATUS HISTORY
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. DEAL PROPOSALS (versioned negotiation snapshots)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','presented','accepted','rejected','superseded')),
  -- Snapshot of commercial figures at time of proposal
  vehicle_retail_price numeric(12,2) DEFAULT 0,
  vehicle_selling_price numeric(12,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  products_total numeric(12,2) DEFAULT 0,
  customer_purchase_total numeric(12,2) DEFAULT 0,
  px_allowance numeric(12,2) DEFAULT 0,
  px_settlement numeric(12,2) DEFAULT 0,
  px_equity numeric(12,2) DEFAULT 0,
  deposit numeric(10,2) DEFAULT 0,
  finance_amount numeric(12,2) DEFAULT 0,
  balance_to_fund numeric(12,2) DEFAULT 0,
  -- Metadata
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  presented_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. DEAL APPROVALS (discount/cancellation/override workflow)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('discount','cancellation','price_override','other')),
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_at timestamptz,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. DEAL LINE ITEMS (products, accessories, warranties, delivery)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('warranty','paint_protection','service_plan','accessory','delivery','other')),
  description text NOT NULL,
  customer_price numeric(10,2) NOT NULL DEFAULT 0,
  dealer_cost numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  tax_treatment text DEFAULT 'standard', -- standard, exempt, zero_rated, margin_scheme
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. PART EXCHANGES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.part_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Vehicle identity
  registration text NOT NULL,
  vin text,
  make text,
  model text,
  derivative text,
  year integer,
  mileage integer,
  colour text,
  fuel_type text,
  transmission text,
  -- Condition & history
  condition text DEFAULT 'unknown' CHECK (condition IN ('excellent','good','fair','poor','unknown')),
  service_history text DEFAULT 'unknown' CHECK (service_history IN ('full','partial','none','unknown')),
  keys_count integer DEFAULT 1,
  mot_status text DEFAULT 'unknown' CHECK (mot_status IN ('valid','expired','unknown','advisory')),
  mot_expiry date,
  warning_lights boolean DEFAULT false,
  notes text,
  -- Appraisal areas (jsonb: {bodywork, wheels, tyres, interior, glass, mechanical, warning_lights} each: good/attention/poor/unknown + notes)
  appraisal jsonb DEFAULT '{}'::jsonb,
  -- Photos
  photos text[] DEFAULT '{}',
  photo_paths text[] DEFAULT '{}',
  -- Valuation
  customer_expectation numeric(10,2),
  trade_value numeric(10,2),
  retail_estimate numeric(10,2),
  allowance numeric(10,2) DEFAULT 0,
  valuation_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  valuation_at timestamptz,
  valuation_provider text, -- 'manual', 'cap_hpi', 'glass', 'motorcheck', other
  valuation_reference text,
  valuation_data jsonb DEFAULT '{}'::jsonb,
  -- Finance settlement
  finance_outstanding boolean DEFAULT false,
  finance_provider text,
  settlement_amount numeric(10,2) DEFAULT 0,
  settlement_reference text,
  settlement_valid_until date,
  settlement_document_path text,
  settlement_status text DEFAULT 'unknown'
    CHECK (settlement_status IN ('unknown','requested','received','confirmed','paid','not_applicable')),
  -- Status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','appraised','accepted','rejected','acquired_to_stock')),
  -- If accepted and acquired, link to new stock vehicle
  acquired_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  -- Audit
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. RESERVATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  salesperson_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','expired','cancelled','converted_to_sale')),
  deposit_amount numeric(10,2) DEFAULT 0,
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancellation_reason text,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- CRITICAL: Prevent two active reservations for the same vehicle
-- This is enforced at DB level, not just UI
CREATE UNIQUE INDEX IF NOT EXISTS reservations_vehicle_active_unique_idx
  ON public.reservations (vehicle_id)
  WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- 8. PAYMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'sales_deposit'
    CHECK (category IN ('reservation_deposit','sales_deposit','balance_payment','refund','other')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  method text NOT NULL DEFAULT 'card'
    CHECK (method IN ('card','bank_transfer','cash','finance','other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','recorded','verified','failed','refunded','partially_refunded')),
  -- Clearly distinguishes manually entered payments from provider-verified ones
  is_manually_recorded boolean NOT NULL DEFAULT true,
  -- Provider integration
  provider text DEFAULT 'manual'
    CHECK (provider IN ('stripe','manual','other')),
  provider_reference text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_checkout_session_id text,
  -- Timestamps
  received_at timestamptz,
  refunded_at timestamptz,
  refunded_amount numeric(12,2),
  refund_reason text,
  refund_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  receipt_generated_at timestamptz,
  -- Audit
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Idempotency: prevent double-processing a Stripe event
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_intent_idx
  ON public.payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_idx
  ON public.payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. FINANCE PROPOSALS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Provider info
  provider text,
  product_type text DEFAULT 'hp'
    CHECK (product_type IN ('hp','pcp','bch','personal_loan','other')),
  -- Figures — ONLY populated from real provider responses or authorised manual input
  -- AI must NEVER populate these fields
  vehicle_price numeric(12,2) DEFAULT 0,
  deposit numeric(10,2) DEFAULT 0,
  px_equity numeric(12,2) DEFAULT 0,
  amount_to_finance numeric(12,2) DEFAULT 0,
  term_months integer,
  annual_mileage integer,
  apr numeric(6,4),        -- e.g. 0.0999 = 9.99%
  monthly_payment numeric(10,2),
  final_payment numeric(10,2),
  -- Status
  status text NOT NULL DEFAULT 'discussion'
    CHECK (status IN (
      'not_required','discussion','quote_requested','quote_received',
      'application_pending','submitted','approved','declined',
      'documents_required','activated','cancelled'
    )),
  is_manually_recorded boolean NOT NULL DEFAULT true,
  external_reference text,
  notes text,
  -- Timestamps
  submitted_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 10. DEAL DOCUMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  document_type text NOT NULL
    CHECK (document_type IN (
      'proposal','order_form','invoice','deposit_receipt',
      'part_exchange_appraisal','finance_document','settlement_letter',
      'id_document','compliance_document','handover_document','other'
    )),
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  mime_type text DEFAULT 'application/pdf',
  template_type text,
  template_version text,
  checksum text,
  is_customer_facing boolean DEFAULT false,
  notes text,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 11. DEAL INVOICES
-- ----------------------------------------------------------------------------

-- Per-dealership invoice number sequence via a counter table
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  dealership_id uuid PRIMARY KEY REFERENCES public.dealerships(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.deal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  issued_at timestamptz DEFAULT now(),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_treatment jsonb DEFAULT '{}'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','voided')),
  notes text,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(dealership_id, invoice_number)
);

-- Atomic function to get next invoice number (prevents duplicates under concurrency)
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_dealership_id uuid)
RETURNS text AS $$
DECLARE
  v_number integer;
  v_year text;
BEGIN
  INSERT INTO invoice_counters (dealership_id, last_number)
  VALUES (p_dealership_id, 1)
  ON CONFLICT (dealership_id) DO UPDATE
    SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO v_number;

  v_year := TO_CHAR(NOW(), 'YYYY');
  RETURN 'INV-' || v_year || '-' || LPAD(v_number::text, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 12. HANDOVER CHECKLISTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.handover_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  -- checklist_items: [{key, label, status (pending/complete/na), notes, completed_at, completed_by}]
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE public.deal_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_status_history_policy" ON public.deal_status_history
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_proposals_policy" ON public.deal_proposals
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_approvals_policy" ON public.deal_approvals
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_line_items_policy" ON public.deal_line_items
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "part_exchanges_policy" ON public.part_exchanges
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "reservations_policy" ON public.reservations
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "payments_policy" ON public.payments
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "finance_proposals_policy" ON public.finance_proposals
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_documents_policy" ON public.deal_documents
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_invoices_policy" ON public.deal_invoices
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "invoice_counters_policy" ON public.invoice_counters
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "handover_checklists_policy" ON public.handover_checklists
  FOR ALL USING (dealership_id = get_dealership_id());

-- Service role can manage payments (for Stripe webhooks)
CREATE POLICY "service_role_payments" ON public.payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_deals" ON public.deals
  FOR ALL USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 14. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS deals_dealership_status_salesperson_idx ON public.deals(dealership_id, status, salesperson_id);
CREATE INDEX IF NOT EXISTS deals_dealership_created_idx ON public.deals(dealership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deals_reference_idx ON public.deals(deal_reference);
CREATE INDEX IF NOT EXISTS deals_handover_at_idx ON public.deals(dealership_id, handover_at) WHERE handover_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS deal_proposals_deal_idx ON public.deal_proposals(deal_id, version DESC);
CREATE INDEX IF NOT EXISTS deal_approvals_deal_pending_idx ON public.deal_approvals(deal_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS deal_line_items_deal_idx ON public.deal_line_items(deal_id);

CREATE INDEX IF NOT EXISTS part_exchanges_deal_idx ON public.part_exchanges(deal_id);
CREATE INDEX IF NOT EXISTS part_exchanges_dealership_status_idx ON public.part_exchanges(dealership_id, status);

CREATE INDEX IF NOT EXISTS reservations_vehicle_idx ON public.reservations(vehicle_id, status);
CREATE INDEX IF NOT EXISTS reservations_deal_idx ON public.reservations(deal_id);

CREATE INDEX IF NOT EXISTS payments_deal_idx ON public.payments(deal_id);
CREATE INDEX IF NOT EXISTS payments_dealership_status_idx ON public.payments(dealership_id, status);

CREATE INDEX IF NOT EXISTS finance_proposals_deal_idx ON public.finance_proposals(deal_id);
CREATE INDEX IF NOT EXISTS deal_documents_deal_idx ON public.deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS deal_invoices_deal_idx ON public.deal_invoices(deal_id);
CREATE INDEX IF NOT EXISTS handover_checklists_deal_idx ON public.handover_checklists(deal_id);
CREATE INDEX IF NOT EXISTS deal_status_history_deal_idx ON public.deal_status_history(deal_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 15. RBAC — PHASE 3 PERMISSIONS
-- ----------------------------------------------------------------------------

INSERT INTO permissions (id, category, name, description) VALUES
  ('deals.cancel', 'deals', 'Cancel Deal', 'Cancel an active deal with reason'),
  ('deals.complete', 'deals', 'Complete Deal', 'Mark a deal as completed and vehicle as sold'),
  ('deals.discount', 'deals', 'Apply Discount', 'Apply a discount to a deal'),
  ('deals.approve_discount', 'deals', 'Approve Discount', 'Approve discount requests above salesperson threshold'),
  ('part_exchange.read', 'deals', 'View Part Exchange', 'View part exchange details'),
  ('part_exchange.manage', 'deals', 'Manage Part Exchange', 'Create, edit and value part exchanges'),
  ('payments.read', 'deals', 'View Payments', 'View payment records and receipts'),
  ('payments.record', 'deals', 'Record Payment', 'Record manual payments and initiate Stripe deposits'),
  ('payments.refund', 'deals', 'Refund Payment', 'Authorise and process payment refunds'),
  ('handover.manage', 'deals', 'Manage Handover', 'Complete handover checklists and mark handovers done'),
  ('documents.generate', 'deals', 'Generate Documents', 'Generate order forms, invoices and receipts'),
  ('margin.read', 'deals', 'View Gross Margin', 'View vehicle cost and deal gross margin figures')
ON CONFLICT (id) DO UPDATE SET
  category = excluded.category,
  name = excluded.name,
  description = excluded.description;

-- Dealer Principal: all permissions (already granted via wildcard in 003)
-- Just ensure new ones are covered
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'dealer_principal', id FROM permissions
WHERE id IN (
  'deals.cancel','deals.complete','deals.discount','deals.approve_discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record','payments.refund',
  'handover.manage','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- Administrator: all except margin.read at their discretion (granting full admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'administrator', id FROM permissions
WHERE id IN (
  'deals.cancel','deals.complete','deals.discount','deals.approve_discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record','payments.refund',
  'handover.manage','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- Sales Manager: most deal operations including margin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'sales_manager', id FROM permissions
WHERE id IN (
  'deals.cancel','deals.complete','deals.discount','deals.approve_discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record',
  'handover.manage','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- Sales Executive: basic deal operations, NO margin.read, NO refunds, NO approval
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'sales_executive', id FROM permissions
WHERE id IN (
  'deals.discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record',
  'handover.manage','documents.generate'
)
ON CONFLICT DO NOTHING;

-- Finance/Compliance: read payments, generate docs
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'finance_compliance', id FROM permissions
WHERE id IN (
  'payments.read','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 16. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deal_proposals_updated_at') THEN
    CREATE TRIGGER deal_proposals_updated_at BEFORE UPDATE ON public.deal_proposals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deal_approvals_updated_at') THEN
    CREATE TRIGGER deal_approvals_updated_at BEFORE UPDATE ON public.deal_approvals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deal_line_items_updated_at') THEN
    CREATE TRIGGER deal_line_items_updated_at BEFORE UPDATE ON public.deal_line_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'part_exchanges_updated_at') THEN
    CREATE TRIGGER part_exchanges_updated_at BEFORE UPDATE ON public.part_exchanges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reservations_updated_at') THEN
    CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payments_updated_at') THEN
    CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'finance_proposals_updated_at') THEN
    CREATE TRIGGER finance_proposals_updated_at BEFORE UPDATE ON public.finance_proposals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handover_checklists_updated_at') THEN
    CREATE TRIGGER handover_checklists_updated_at BEFORE UPDATE ON public.handover_checklists
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
-- ============================================================================
-- FORECOURTIQ DMS — PHASE 5: LIVE AUTOMOTIVE INTEGRATIONS, ADVERTISING FEEDS,
-- COMMUNICATIONS, FINANCE & ACCOUNTING CONNECTIVITY
-- Migration: 007_phase5_integrations.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INTEGRATION PROVIDERS REGISTRY (System Canonical Catalog)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_providers (
  id text PRIMARY KEY, -- provider key: 'dvla', 'cap_hpi', 'autotrader', etc.
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'vehicle_data',
    'valuation',
    'advertising',
    'finance',
    'accounting',
    'communications',
    'payments',
    'esignature',
    'identity',
    'acquisition',
    'monitoring'
  )),
  description text NOT NULL,
  documentation_reference text,
  supports_webhooks boolean DEFAULT false,
  supports_oauth boolean DEFAULT false,
  supports_api_key boolean DEFAULT false,
  auth_type text NOT NULL DEFAULT 'api_key', -- 'api_key', 'oauth2', 'credentials', 'webhook_only', 'none'
  required_fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed Canonical Provider Definitions
INSERT INTO public.integration_providers (id, name, category, description, auth_type, supports_api_key, supports_oauth, supports_webhooks, required_fields)
VALUES
  -- Vehicle Data & Valuation
  ('dvla', 'DVLA Vehicle Enquiry Service', 'vehicle_data', 'Official UK vehicle registration, tax and MOT data.', 'api_key', true, false, false, '["api_key"]'::jsonb),
  ('cap_hpi', 'CAP HPI Valuations & Provenance', 'vehicle_data', 'Trade valuations, retail market pricing, and vehicle provenance checks.', 'credentials', true, false, false, '["api_key", "account_id"]'::jsonb),
  
  -- Advertising Portals
  ('autotrader', 'AutoTrader UK', 'advertising', 'Real-time stock feed publishing and portal lead ingestion via AutoTrader Connect API.', 'api_key', true, false, true, '["advertiser_id", "api_key"]'::jsonb),
  ('motors', 'Motors.co.uk', 'advertising', 'Automated classified feed syndication and enquiry capture.', 'api_key', true, false, true, '["dealer_id", "api_key"]'::jsonb),
  ('cargurus', 'CarGurus UK', 'advertising', 'Inventory feeds, market rating sync and buyer enquiries.', 'api_key', true, false, true, '["dealer_id", "api_key"]'::jsonb),
  ('ebay_motors', 'eBay Motors UK', 'advertising', 'Automated marketplace listing syndication and inventory sync.', 'oauth2', false, true, true, '["store_id", "client_id", "client_secret"]'::jsonb),
  ('pistonheads', 'PistonHeads', 'advertising', 'Classified stock feed publishing and buyer enquiry routing.', 'api_key', true, false, true, '["dealer_id", "api_key"]'::jsonb),
  
  -- Communications
  ('sendgrid', 'SendGrid Email', 'communications', 'Transactional and CRM email delivery, template sync and reply tracking.', 'api_key', true, false, true, '["api_key", "sender_email"]'::jsonb),
  ('resend', 'Resend Email', 'communications', 'Modern developer-first email infrastructure for dealer messaging.', 'api_key', true, false, true, '["api_key", "sender_email"]'::jsonb),
  ('twilio', 'Twilio SMS', 'communications', 'Automated SMS alerts, appointment confirmations and two-way messaging.', 'credentials', true, false, true, '["account_sid", "auth_token", "phone_number"]'::jsonb),
  ('whatsapp', 'WhatsApp Business API', 'communications', 'Official Meta WhatsApp Cloud API for conversational sales & customer updates.', 'api_key', true, false, true, '["phone_number_id", "api_token", "business_account_id"]'::jsonb),
  
  -- Finance Systems
  ('codeweavers', 'Codeweavers Finance', 'finance', 'Integrated point-of-sale finance calculators, proposals and lender routing.', 'api_key', true, false, true, '["api_key", "dealer_reference"]'::jsonb),
  ('ivendi', 'iVendi Finance Platform', 'finance', 'Online finance quoting, multi-lender applications and customer pre-approvals.', 'api_key', true, false, true, '["partner_id", "api_key"]'::jsonb),
  ('evolution', 'Evolution Funding', 'finance', 'Broker finance proposal submission and real-time payout milestone tracking.', 'api_key', true, false, true, '["dealer_code", "api_key"]'::jsonb),
  
  -- Accounting
  ('xero', 'Xero Accounting', 'accounting', 'Automated sync of vehicle sales invoices, stock acquisitions and customer ledgers.', 'oauth2', false, true, true, '["client_id", "client_secret"]'::jsonb),
  ('quickbooks', 'QuickBooks Online', 'accounting', 'Direct invoice and operational cost export to Intuit QuickBooks.', 'oauth2', false, true, true, '["client_id", "client_secret"]'::jsonb),
  ('sage', 'Sage Business Cloud', 'accounting', 'Commercial bookkeeping and vehicle invoice journal export.', 'oauth2', false, true, true, '["client_id", "client_secret"]'::jsonb),
  
  -- Payments
  ('stripe', 'Stripe Payments', 'payments', 'Card payments, holding deposits, customer checkout links and verified webhooks.', 'api_key', true, false, true, '["secret_key", "publishable_key", "webhook_secret"]'::jsonb),
  
  -- E-Signature & Identity
  ('docusign', 'DocuSign E-Signature', 'esignature', 'Secure electronic signatures for order forms, finance agreements and handover receipts.', 'oauth2', false, true, true, '["account_id", "client_id", "client_secret"]'::jsonb),
  ('veriff', 'Veriff Identity Verification', 'identity', 'Government ID verification and automated anti-fraud checks for vehicle sales.', 'api_key', true, false, true, '["api_key", "api_secret"]'::jsonb),
  
  -- Sourcing & Wholesale
  ('bca', 'BCA Auction Integration', 'acquisition', 'Direct wholesale stock procurement, auction catalogue search and vehicle import.', 'credentials', true, false, false, '["account_id", "api_key"]'::jsonb),
  ('manheim', 'Manheim Auctions', 'acquisition', 'Cox Automotive auction purchase import and landing cost synchronization.', 'credentials', true, false, false, '["account_id", "api_key"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  supports_api_key = EXCLUDED.supports_api_key,
  supports_oauth = EXCLUDED.supports_oauth,
  supports_webhooks = EXCLUDED.supports_webhooks,
  required_fields = EXCLUDED.required_fields;

-- ----------------------------------------------------------------------------
-- 2. DEALERSHIP INTEGRATION CONFIGURATIONS (Multi-Tenant Connections)
-- ----------------------------------------------------------------------------
-- Drop old thin constraint if exists or update table
CREATE TABLE IF NOT EXISTS public.dealership_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  status text NOT NULL DEFAULT 'credentials_required' CHECK (status IN (
    'available',
    'not_configured',
    'credentials_required',
    'commercial_access_required',
    'pending_connection',
    'connected',
    'degraded',
    'error',
    'disabled',
    'unsupported'
  )),
  
  health text NOT NULL DEFAULT 'unknown' CHECK (health IN (
    'healthy',
    'warning',
    'degraded',
    'failed',
    'unknown'
  )),
  
  credentials_encrypted text, -- Server-side encrypted secrets
  settings jsonb DEFAULT '{}'::jsonb, -- Custom dealer configuration/mappings
  metadata jsonb DEFAULT '{}'::jsonb, -- External account info (e.g. org name, advertiser id)
  
  connected_at timestamptz,
  connected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_sync_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (dealership_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_dealership_integrations_tenant ON public.dealership_integrations(dealership_id);
CREATE INDEX IF NOT EXISTS idx_dealership_integrations_provider ON public.dealership_integrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_dealership_integrations_status ON public.dealership_integrations(status);

-- ----------------------------------------------------------------------------
-- 3. INTEGRATION EXECUTION LOGS (Request / Response Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  operation text NOT NULL, -- e.g. 'lookup_vehicle', 'publish_listing', 'sync_invoice', 'send_sms'
  entity_type text,        -- e.g. 'vehicle', 'deal', 'lead', 'invoice'
  entity_id uuid,
  
  status text NOT NULL CHECK (status IN ('success', 'failed', 'retrying', 'skipped')),
  duration_ms integer,
  
  external_reference text,
  error_code text,
  error_message text,
  
  request_metadata jsonb DEFAULT '{}'::jsonb,  -- Sanitized request params
  response_metadata jsonb DEFAULT '{}'::jsonb, -- Sanitized response summary
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_runs_dealership ON public.integration_runs(dealership_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_provider ON public.integration_runs(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_entity ON public.integration_runs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_created ON public.integration_runs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. ADVERTISING PORTAL LISTINGS (Vehicle Advertising Relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  external_listing_id text,
  status text NOT NULL DEFAULT 'not_published' CHECK (status IN (
    'not_published',
    'queued',
    'publishing',
    'live',
    'update_pending',
    'error',
    'removed',
    'unsupported',
    'connection_required'
  )),
  
  price_at_publish numeric(12,2),
  last_published_at timestamptz,
  last_updated_at timestamptz,
  last_verified_at timestamptz,
  
  provider_url text,
  error_state text,
  error_message text,
  payload_snapshot jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (dealership_id, vehicle_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_listings_dealership ON public.portal_listings(dealership_id);
CREATE INDEX IF NOT EXISTS idx_portal_listings_vehicle ON public.portal_listings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_portal_listings_status ON public.portal_listings(status);
CREATE INDEX IF NOT EXISTS idx_portal_listings_provider ON public.portal_listings(provider_id);

-- ----------------------------------------------------------------------------
-- 5. PORTAL FEED BACKGROUND JOBS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_feed_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  job_type text NOT NULL CHECK (job_type IN ('publish', 'update', 'withdraw', 'sync')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
  
  attempt_count integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  next_attempt_at timestamptz DEFAULT now(),
  
  last_error text,
  payload jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_portal_feed_jobs_status ON public.portal_feed_jobs(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_portal_feed_jobs_tenant ON public.portal_feed_jobs(dealership_id);

-- ----------------------------------------------------------------------------
-- 6. VEHICLE VALUATION SNAPSHOTS (Historical Provider-Derived Pricing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  valuation_type text NOT NULL DEFAULT 'market' CHECK (valuation_type IN ('acquisition', 'part_exchange', 'stock_review', 'market')),
  trade_value numeric(12,2),
  retail_value numeric(12,2),
  private_value numeric(12,2),
  part_exchange_value numeric(12,2),
  
  mileage integer,
  valuation_date date NOT NULL DEFAULT CURRENT_DATE,
  provider_reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_valuations_vehicle ON public.vehicle_valuations(vehicle_id, valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_valuations_tenant ON public.vehicle_valuations(dealership_id);

-- ----------------------------------------------------------------------------
-- 7. VEHICLE PROVENANCE & CHECKS (HPI / DVLA History)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  check_type text NOT NULL CHECK (check_type IN ('hpi_full', 'dvla_lookup', 'mot_history', 'mileage_anomaly', 'finance_check')),
  external_reference text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  status text NOT NULL CHECK (status IN ('passed', 'warning', 'failed', 'pending', 'error')),
  summary text NOT NULL,
  check_data jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_checks_vehicle ON public.vehicle_checks(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checks_tenant ON public.vehicle_checks(dealership_id);

-- ----------------------------------------------------------------------------
-- 8. ACCOUNTING CONFIGURATION & SYNC MAPPINGS (Xero / QuickBooks / Sage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  sales_account_code text,      -- e.g. '200' (Vehicle Sales)
  cost_of_sales_account_code text, -- e.g. '300' (Vehicle Purchase Cost)
  prep_cost_account_code text,  -- e.g. '310' (Workshop & Prep Expenses)
  deposit_account_code text,    -- e.g. '800' (Holding Deposits Liability)
  vat_scheme text DEFAULT 'margin_scheme' CHECK (vat_scheme IN ('margin_scheme', 'standard_vat', 'qualifying_vehicle')),
  
  auto_sync_completed_deals boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (dealership_id, provider_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  
  entity_type text NOT NULL CHECK (entity_type IN ('sales_invoice', 'purchase_invoice', 'deposit_receipt', 'refund')),
  entity_id uuid NOT NULL,
  
  external_invoice_id text,
  external_invoice_number text,
  sync_status text NOT NULL CHECK (sync_status IN ('not_synced', 'queued', 'syncing', 'synced', 'error', 'excluded')),
  
  synced_at timestamptz,
  error_message text,
  payload_sent jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (dealership_id, provider_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_sync_entity ON public.accounting_sync_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 9. PROVIDER USAGE & UNIT ECONOMICS METRICS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.integration_providers(id) ON DELETE RESTRICT,
  operation text NOT NULL,
  
  quantity integer NOT NULL DEFAULT 1,
  cost_estimate numeric(8,4) DEFAULT 0.0000,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_usage_tenant_period ON public.provider_usage(dealership_id, recorded_at);

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealership_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_feed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_usage ENABLE ROW LEVEL SECURITY;

-- Integration Providers: Visible to all authenticated users
CREATE POLICY "integration_providers_auth_read" ON public.integration_providers
  FOR SELECT TO authenticated USING (true);

-- Dealership-scoped RLS policies
CREATE POLICY "dealership_integrations_tenant_isolation" ON public.dealership_integrations
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "integration_runs_tenant_isolation" ON public.integration_runs
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "portal_listings_tenant_isolation" ON public.portal_listings
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "portal_feed_jobs_tenant_isolation" ON public.portal_feed_jobs
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "vehicle_valuations_tenant_isolation" ON public.vehicle_valuations
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "vehicle_checks_tenant_isolation" ON public.vehicle_checks
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "accounting_mappings_tenant_isolation" ON public.accounting_mappings
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "accounting_sync_logs_tenant_isolation" ON public.accounting_sync_logs
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "provider_usage_tenant_isolation" ON public.provider_usage
  FOR ALL USING (dealership_id = auth_dealership_id());

-- ----------------------------------------------------------------------------
-- 11. RBAC SEED FOR PHASE 5 PERMISSIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (id, name, description, module) VALUES
  ('integrations.read', 'View Dealership Integrations', 'View connected providers, health and sync states', 'integrations'),
  ('integrations.manage', 'Manage Dealership Integrations', 'Configure credentials, connect/disconnect providers and run tests', 'integrations'),
  ('advertising.read', 'View Advertising Feeds', 'View portal advertising listings, status and error work queue', 'advertising'),
  ('advertising.publish', 'Publish/Withdraw Advertising Feeds', 'Trigger publishing, price updates or listing withdrawals across classified portals', 'advertising'),
  ('accounting.sync', 'Sync Accounting Ledgers', 'Trigger invoice and purchase cost sync to Xero/QuickBooks/Sage', 'accounting'),
  ('accounting.manage', 'Manage Accounting Mappings', 'Configure chart of accounts codes and tax treatment rules', 'accounting')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  module = EXCLUDED.module;

-- Map permissions to roles
-- Dealer Principal & Administrator: Full access
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('dealer_principal', 'integrations.read'),
  ('dealer_principal', 'integrations.manage'),
  ('dealer_principal', 'advertising.read'),
  ('dealer_principal', 'advertising.publish'),
  ('dealer_principal', 'accounting.sync'),
  ('dealer_principal', 'accounting.manage'),
  ('admin', 'integrations.read'),
  ('admin', 'integrations.manage'),
  ('admin', 'advertising.read'),
  ('admin', 'advertising.publish'),
  ('admin', 'accounting.sync'),
  ('admin', 'accounting.manage'),
  -- Sales Manager
  ('sales_manager', 'integrations.read'),
  ('sales_manager', 'advertising.read'),
  ('sales_manager', 'advertising.publish'),
  ('sales_manager', 'accounting.sync'),
  -- Sales Executive
  ('sales_executive', 'advertising.read'),
  ('sales_executive', 'advertising.publish'),
  -- Finance / Accounts
  ('accounts_clerk', 'accounting.sync'),
  ('accounts_clerk', 'accounting.manage')
ON CONFLICT DO NOTHING;
