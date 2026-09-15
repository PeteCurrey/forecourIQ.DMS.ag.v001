-- ============================================================================
-- Phase 2: Stock Management Module Extensions & Filter Presets
-- ============================================================================

-- 1. Extend vehicles table with explicit source, VRM alias, and reconditioning rollup
alter table vehicles add column if not exists source text default 'other'
  check (source in ('trade_in', 'auction', 'part_ex', 'sourced_ai', 'other'));

alter table vehicles add column if not exists vrm text;
update vehicles set vrm = registration where vrm is null;

alter table vehicles add column if not exists cost_price numeric(10,2);
update vehicles set cost_price = purchase_price where cost_price is null and purchase_price is not null;

alter table vehicles add column if not exists forecourt_price numeric(10,2);
update vehicles set forecourt_price = asking_price where forecourt_price is null and asking_price is not null;

alter table vehicles add column if not exists reconditioning_cost_total numeric(10,2) default 0;

-- 2. Add configurable aging thresholds to dealerships
alter table dealerships add column if not exists stock_aging_warn_days integer default 45;
alter table dealerships add column if not exists stock_aging_danger_days integer default 60;
alter table dealerships add column if not exists stock_aging_critical_days integer default 90;

-- 3. Stock Filter Presets per user
create table if not exists stock_filter_presets (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Enable RLS and tenant-scoped policies
alter table stock_filter_presets enable row level security;

create policy "stock_filter_presets_select_policy" on stock_filter_presets
  for select using (
    dealership_id in (select dealership_id from profiles where id = auth.uid())
    and (user_id = auth.uid() or is_default = true)
  );

create policy "stock_filter_presets_insert_policy" on stock_filter_presets
  for insert with check (
    dealership_id in (select dealership_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "stock_filter_presets_update_policy" on stock_filter_presets
  for update using (
    dealership_id in (select dealership_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "stock_filter_presets_delete_policy" on stock_filter_presets
  for delete using (
    dealership_id in (select dealership_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

-- Indexes
create index if not exists idx_stock_filter_presets_user on stock_filter_presets(user_id, dealership_id);
create index if not exists idx_vehicles_source on vehicles(dealership_id, source);
create index if not exists idx_vehicles_vrm on vehicles(dealership_id, vrm);
