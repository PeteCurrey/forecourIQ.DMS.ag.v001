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
