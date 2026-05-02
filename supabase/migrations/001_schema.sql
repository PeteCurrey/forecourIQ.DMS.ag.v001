-- Enable UUID extension
create extension if not exists "uuid-ossp";

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
  subscription_tier text default 'starter',
  subscription_status text default 'trialing',
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
  role text default 'sales',
  avatar_url text,
  created_at timestamptz default now()
);

-- VEHICLES
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
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
  mot_expiry date,
  service_history text default 'unknown',
  hpi_clear boolean default false,
  hpi_checked_at timestamptz,
  condition text default 'good',
  purchase_price numeric(10,2),
  prep_cost numeric(10,2) default 0,
  transport_cost numeric(10,2) default 0,
  asking_price numeric(10,2),
  trade_value numeric(10,2),
  cap_retail numeric(10,2),
  cap_trade numeric(10,2),
  status text default 'available',
  description text,
  highlights text[],
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LEADS
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  vehicle_id uuid references vehicles,
  source text not null,
  status text default 'new',
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  message text,
  notes text,
  finance_interest boolean default false,
  part_ex_reg text,
  part_ex_value numeric(10,2),
  assigned_to uuid references profiles,
  next_followup_at timestamptz,
  last_contacted_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ACTIVITIES
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid references dealerships not null,
  lead_id uuid references leads,
  vehicle_id uuid references vehicles,
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

-- RLS: enable on all tables
alter table dealerships enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table leads enable row level security;
alter table activities enable row level security;
alter table expenses enable row level security;
alter table buying_signals enable row level security;
alter table market_data enable row level security;

-- Helper function
create or replace function get_dealership_id()
returns uuid as $$
  select dealership_id from profiles
  where id = auth.uid()
$$ language sql security definer stable;

-- RLS policies
create policy "users_own_dealership" on dealerships
  for all using (id = get_dealership_id());

create policy "users_own_profile" on profiles
  for all using (id = auth.uid());

create policy "dealership_vehicles" on vehicles
  for all using (dealership_id = get_dealership_id());

create policy "dealership_leads" on leads
  for all using (dealership_id = get_dealership_id());

create policy "dealership_activities" on activities
  for all using (dealership_id = get_dealership_id());

create policy "dealership_expenses" on expenses
  for all using (dealership_id = get_dealership_id());

create policy "dealership_signals" on buying_signals
  for all using (dealership_id = get_dealership_id());

create policy "dealership_market" on market_data
  for all using (dealership_id = get_dealership_id());

-- Service role bypass for API routes
create policy "service_role_all" on vehicles
  for all using (auth.role() = 'service_role');

create policy "service_role_leads" on leads
  for all using (auth.role() = 'service_role');

create policy "service_role_dealerships" on dealerships
  for all using (auth.role() = 'service_role');

-- Indexes
create index if not exists vehicles_dealership_status_idx on vehicles(dealership_id, status);
create index if not exists vehicles_dealership_created_idx on vehicles(dealership_id, created_at desc);
create index if not exists leads_dealership_status_idx on leads(dealership_id, status);
create index if not exists leads_dealership_created_idx on leads(dealership_id, created_at desc);
create index if not exists activities_lead_created_idx on activities(lead_id, created_at desc);
create index if not exists buying_signals_dealership_date_idx on buying_signals(dealership_id, generated_date desc);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'vehicles_updated_at') then
    create trigger vehicles_updated_at before update on vehicles for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'leads_updated_at') then
    create trigger leads_updated_at before update on leads for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'dealerships_updated_at') then
    create trigger dealerships_updated_at before update on dealerships for each row execute function update_updated_at();
  end if;
end $$;
