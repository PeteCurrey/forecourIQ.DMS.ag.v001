-- ============================================================================
-- FORECOURTIQ DMS — RBAC SYSTEM SEED (003_rbac_seed.sql)
-- Default roles, permissions, and role_permissions mapping
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SYSTEM ROLES
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
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

-- ----------------------------------------------------------------------------
-- 2. SYSTEM PERMISSIONS
-- ----------------------------------------------------------------------------

insert into permissions (id, category, name, description) values
  -- Stock / Vehicles
  ('stock.read', 'stock', 'View Stock', 'View vehicle stockbook and specifications'),
  ('stock.create', 'stock', 'Add Vehicle', 'Add new vehicles to stock'),
  ('stock.update', 'stock', 'Update Vehicle', 'Edit vehicle details, pricing, and specs'),
  ('stock.delete', 'stock', 'Delete Vehicle', 'Remove vehicles from stock'),
  ('stock.costs', 'stock', 'Manage Costs', 'View and edit vehicle prep/acquisition costs'),
  ('stock.publish', 'stock', 'Publish Advertising', 'Publish vehicles to advertising portals and website'),

  -- Customers
  ('customers.read', 'customers', 'View Customers', 'View customer database and contact details'),
  ('customers.create', 'customers', 'Create Customer', 'Add new customer records'),
  ('customers.update', 'customers', 'Update Customer', 'Edit customer information and consent'),
  ('customers.delete', 'customers', 'Delete Customer', 'Delete customer records'),

  -- Leads
  ('leads.read', 'leads', 'View Leads', 'View incoming leads and enquiries'),
  ('leads.create', 'leads', 'Create Lead', 'Create manual lead records'),
  ('leads.update', 'leads', 'Update Lead', 'Update lead status, notes, and details'),
  ('leads.assign', 'leads', 'Assign Leads', 'Assign leads to sales executives'),
  ('leads.respond', 'leads', 'Respond to Leads', 'Send communications to lead contacts'),

  -- Deals
  ('deals.read', 'deals', 'View Deals', 'View deal desk and sales records'),
  ('deals.create', 'deals', 'Create Deal', 'Structure new deals, deposits, and proposals'),
  ('deals.update', 'deals', 'Update Deal', 'Edit deal terms and items'),
  ('deals.approve_discount', 'deals', 'Approve Discounts', 'Approve discounts beyond salesperson limits'),
  ('deals.complete', 'deals', 'Complete Deal', 'Finalise deal and mark vehicle as sold'),

  -- Finance & Compliance
  ('finance.read', 'finance', 'View Finance', 'View finance proposals and quotes'),
  ('finance.manage', 'finance', 'Manage Finance', 'Submit and manage finance applications'),
  ('compliance.read', 'compliance', 'View Compliance', 'View compliance logs and disclosures'),
  ('compliance.manage', 'compliance', 'Manage Compliance', 'Manage FCA compliance workflows and sign-offs'),

  -- Intelligence & AI
  ('intelligence.read', 'intelligence', 'View Intelligence', 'Access AI Command Centre and market signals'),
  ('intelligence.act', 'intelligence', 'Execute AI Actions', 'Authorise AI recommendations and automated actions'),

  -- Administration & Settings
  ('users.manage', 'system', 'Manage Users', 'Invite, modify roles, and deactivate team members'),
  ('integrations.manage', 'system', 'Manage Integrations', 'Connect and configure external service integrations'),
  ('billing.manage', 'system', 'Manage Billing', 'Manage Stripe subscription and payment methods'),
  ('settings.manage', 'system', 'Manage Settings', 'Update dealership settings, locations, and branding')
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description;

-- ----------------------------------------------------------------------------
-- 3. ROLE-PERMISSION MAPPINGS
-- ----------------------------------------------------------------------------

-- Dealer Principal: All permissions
insert into role_permissions (role_id, permission_id)
select 'dealer_principal', id from permissions
on conflict do nothing;

-- Administrator: All except billing approval if desired (granting full operational admin)
insert into role_permissions (role_id, permission_id)
select 'administrator', id from permissions
where id not in ('billing.manage')
on conflict do nothing;

-- Sales Manager
insert into role_permissions (role_id, permission_id)
select 'sales_manager', id from permissions
where category in ('stock', 'customers', 'leads', 'deals')
   or id in ('intelligence.read', 'finance.read', 'compliance.read', 'deals.approve_discount')
on conflict do nothing;

-- Sales Executive
insert into role_permissions (role_id, permission_id)
select 'sales_executive', id from permissions
where id in (
  'stock.read',
  'customers.read', 'customers.create', 'customers.update',
  'leads.read', 'leads.create', 'leads.update', 'leads.respond',
  'deals.read', 'deals.create', 'deals.update',
  'finance.read', 'intelligence.read'
)
on conflict do nothing;

-- Buyer
insert into role_permissions (role_id, permission_id)
select 'buyer', id from permissions
where id in (
  'stock.read', 'stock.create', 'stock.update', 'stock.costs',
  'intelligence.read', 'intelligence.act'
)
on conflict do nothing;

-- Finance / Compliance
insert into role_permissions (role_id, permission_id)
select 'finance_compliance', id from permissions
where id in (
  'deals.read',
  'finance.read', 'finance.manage',
  'compliance.read', 'compliance.manage',
  'customers.read'
)
on conflict do nothing;

-- Marketing
insert into role_permissions (role_id, permission_id)
select 'marketing', id from permissions
where id in (
  'stock.read', 'stock.publish',
  'intelligence.read', 'settings.manage'
)
on conflict do nothing;

-- Read Only
insert into role_permissions (role_id, permission_id)
select 'read_only', id from permissions
where id in (
  'stock.read', 'customers.read', 'leads.read', 'deals.read',
  'finance.read', 'compliance.read', 'intelligence.read'
)
on conflict do nothing;
