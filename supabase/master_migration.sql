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
