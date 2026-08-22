-- ============================================================================
-- FORECOURTIQ DMS — PHASE 1 CORE DATABASE MIGRATION (004_phase1_core.sql)
-- Vehicle Lifecycle, Preparation, Documents, Tasks, Appointments & Consent
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VEHICLE EXTENSIONS (Acquisition, Specs, Location, Advertising)
-- ----------------------------------------------------------------------------

alter table vehicles add column if not exists location_id uuid references dealership_locations(id) on delete set null;
alter table vehicles add column if not exists assigned_user_id uuid references profiles(id) on delete set null;
alter table vehicles add column if not exists purchase_source text;
alter table vehicles add column if not exists supplier_name text;
alter table vehicles add column if not exists auction_house text;
alter table vehicles add column if not exists purchase_date date default current_date;
alter table vehicles add column if not exists purchase_reference text;
alter table vehicles add column if not exists funding_source text;
alter table vehicles add column if not exists auction_fee numeric(10,2) default 0;
alter table vehicles add column if not exists other_acquisition_costs numeric(10,2) default 0;
alter table vehicles add column if not exists keys_count integer default 2;
alter table vehicles add column if not exists service_history_type text;
alter table vehicles add column if not exists mot_expiry_date date;
alter table vehicles add column if not exists hpi_status text default 'clear';
alter table vehicles add column if not exists body_condition text;
alter table vehicles add column if not exists wheel_condition text;
alter table vehicles add column if not exists tyre_condition text;
alter table vehicles add column if not exists internal_notes text;
alter table vehicles add column if not exists advert_ready boolean default false;
alter table vehicles add column if not exists advert_headline text;
alter table vehicles add column if not exists advert_description text;
alter table vehicles add column if not exists features text[];

-- ----------------------------------------------------------------------------
-- 2. PREPARATION JOBS
-- ----------------------------------------------------------------------------

create table if not exists preparation_jobs (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  title text not null,
  category text not null default 'mechanical', -- mechanical, service, mot, tyres, alloy_wheel, bodywork, smart_repair, valeting, detailing, photography, other
  supplier text,
  job_type text not null default 'internal', -- internal, external
  status text not null default 'not_started', -- not_started, scheduled, in_progress, waiting, completed, cancelled
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

-- ----------------------------------------------------------------------------
-- 3. VEHICLE DOCUMENTS
-- ----------------------------------------------------------------------------

create table if not exists vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  document_type text not null, -- purchase_invoice, auction_invoice, v5c_logbook, mot_certificate, service_history, hpi_report, inspection_report, repair_invoice, warranty_paperwork, other
  filename text not null,
  storage_path text not null,
  url text,
  file_size integer,
  mime_type text,
  notes text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 4. VEHICLE STATUS HISTORY
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 5. VEHICLE PRICE HISTORY
-- ----------------------------------------------------------------------------

create table if not exists vehicle_price_history (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2) not null,
  reason text,
  source text default 'manual', -- manual, ai_recommendation, pricing_rule
  changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 6. TASKS
-- ----------------------------------------------------------------------------

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'normal', -- low, normal, high, urgent
  status text not null default 'open', -- open, in_progress, completed, cancelled
  entity_type text, -- vehicle, customer, lead, deal, dealership
  entity_id uuid,
  due_at timestamptz,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 7. APPOINTMENTS
-- ----------------------------------------------------------------------------

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  title text not null,
  appointment_type text not null default 'vehicle_viewing', -- test_drive, sales_appointment, vehicle_viewing, collection, handover, call, other
  status text not null default 'scheduled', -- scheduled, confirmed, arrived, completed, no_show, cancelled
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

-- ----------------------------------------------------------------------------
-- 8. CUSTOMER CONSENT EVENTS
-- ----------------------------------------------------------------------------

create table if not exists customer_consent_events (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  consent_type text not null, -- marketing_email, marketing_sms, marketing_phone, third_party_finance, privacy_policy
  status text not null, -- granted, withdrawn
  source text default 'dms', -- dms, website, in_person, email_link
  ip_address text,
  user_agent text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ----------------------------------------------------------------------------

alter table preparation_jobs enable row level security;
alter table vehicle_documents enable row level security;
alter table vehicle_status_history enable row level security;
alter table vehicle_price_history enable row level security;
alter table tasks enable row level security;
alter table appointments enable row level security;
alter table customer_consent_events enable row level security;

create policy "preparation_jobs_policy" on preparation_jobs
  for all using (dealership_id = get_dealership_id());

create policy "vehicle_documents_policy" on vehicle_documents
  for all using (dealership_id = get_dealership_id());

create policy "vehicle_status_history_policy" on vehicle_status_history
  for all using (dealership_id = get_dealership_id());

create policy "vehicle_price_history_policy" on vehicle_price_history
  for all using (dealership_id = get_dealership_id());

create policy "tasks_policy" on tasks
  for all using (dealership_id = get_dealership_id());

create policy "appointments_policy" on appointments
  for all using (dealership_id = get_dealership_id());

create policy "customer_consent_events_policy" on customer_consent_events
  for all using (dealership_id = get_dealership_id());

-- ----------------------------------------------------------------------------
-- 10. INDEXES
-- ----------------------------------------------------------------------------

create index if not exists prep_jobs_vehicle_idx on preparation_jobs(vehicle_id, status);
create index if not exists prep_jobs_dealership_due_idx on preparation_jobs(dealership_id, due_date);

create index if not exists vehicle_docs_vehicle_idx on vehicle_documents(vehicle_id);
create index if not exists vehicle_status_hist_vehicle_idx on vehicle_status_history(vehicle_id, created_at desc);
create index if not exists vehicle_price_hist_vehicle_idx on vehicle_price_history(vehicle_id, created_at desc);

create index if not exists tasks_dealership_status_due_idx on tasks(dealership_id, status, due_at);
create index if not exists tasks_assigned_idx on tasks(assigned_to, status);
create index if not exists tasks_entity_idx on tasks(entity_type, entity_id);

create index if not exists appointments_dealership_start_idx on appointments(dealership_id, start_at);
create index if not exists appointments_vehicle_idx on appointments(vehicle_id);
create index if not exists appointments_customer_idx on appointments(customer_id);

create index if not exists consent_events_customer_idx on customer_consent_events(customer_id, created_at desc);
