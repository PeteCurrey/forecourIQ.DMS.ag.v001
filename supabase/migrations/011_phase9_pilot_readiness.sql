-- ==============================================================================
-- FORECOURTIQ DMS — PHASE 9 MIGRATION: PRODUCTION HARDENING & PILOT READINESS
-- ==============================================================================

-- 1. Dealership Onboarding Tracker
CREATE TABLE IF NOT EXISTS dealership_onboarding (
  dealership_id UUID PRIMARY KEY REFERENCES dealerships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'ready_for_review', 'complete', 'paused', 'cancelled')),
  current_step TEXT NOT NULL DEFAULT 'dealership',
  steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_forecouriq_user_id UUID,
  review_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Data Import Jobs
CREATE TABLE IF NOT EXISTS data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('stock', 'customers', 'sales_history')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'ready', 'importing', 'completed', 'failed', 'cancelled')),
  file_name TEXT NOT NULL,
  file_reference TEXT,
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_valid INTEGER NOT NULL DEFAULT 0,
  rows_invalid INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. User Invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'dealer_principal', 'sales', 'prep', 'finance', 'compliance')),
  location_id UUID REFERENCES dealership_locations(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'failed')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Dealership Plans & Entitlements
CREATE TABLE IF NOT EXISTS dealership_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'elite')),
  monthly_price_gbp NUMERIC(10,2) NOT NULL,
  max_vehicles INTEGER, -- NULL = unlimited
  max_users INTEGER,    -- NULL = unlimited
  max_locations INTEGER DEFAULT 1,
  website_included BOOLEAN NOT NULL DEFAULT true,
  iq_included BOOLEAN NOT NULL DEFAULT true,
  competitor_tracking BOOLEAN NOT NULL DEFAULT false,
  accounting_sync BOOLEAN NOT NULL DEFAULT false,
  api_access BOOLEAN NOT NULL DEFAULT false,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert standard plan configurations
INSERT INTO dealership_plans (id, name, tier, monthly_price_gbp, max_vehicles, max_users, max_locations, website_included, iq_included, competitor_tracking, accounting_sync, api_access, features)
VALUES 
  ('starter', 'Starter Plan', 'starter', 149.00, 20, 3, 1, true, false, false, false, false, '["Up to 20 vehicles", "3 Team Members", "Dealer Website", "Core Stockbook", "CRM Leads", "Standard Support"]'::jsonb),
  ('professional', 'Professional Plan', 'professional', 299.00, 100, 10, 3, true, true, true, true, false, '["Up to 100 vehicles", "10 Team Members", "Dealer Website", "IQ Operating Layer", "Market Intelligence", "Accounting Sync", "Priority Support"]'::jsonb),
  ('elite', 'Elite Plan', 'elite', 499.00, NULL, NULL, 10, true, true, true, true, true, '["Unlimited vehicles", "Unlimited Users", "Multi-site Support", "Full IQ Operating Layer", "Competitor Tracking", "API Access", "24/7 Dedicated Account Manager"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  monthly_price_gbp = EXCLUDED.monthly_price_gbp,
  max_vehicles = EXCLUDED.max_vehicles,
  max_users = EXCLUDED.max_users,
  max_locations = EXCLUDED.max_locations,
  website_included = EXCLUDED.website_included,
  iq_included = EXCLUDED.iq_included,
  competitor_tracking = EXCLUDED.competitor_tracking,
  accounting_sync = EXCLUDED.accounting_sync,
  api_access = EXCLUDED.api_access,
  features = EXCLUDED.features;

-- 5. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES dealership_plans(id),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'payment_failed', 'cancelled', 'suspended')),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  grace_period_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dealership_id)
);

-- 6. ForecourIQ Platform Operators
CREATE TABLE IF NOT EXISTS platform_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('superadmin', 'support', 'operator', 'analyst')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Platform Audit Logs
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES platform_operators(id) ON DELETE SET NULL,
  dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Support Cases & Messages
CREATE TABLE IF NOT EXISTS support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES platform_operators(id) ON DELETE SET NULL,
  case_number TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('account', 'billing', 'stock', 'website', 'integration', 'crm', 'deal', 'compliance', 'iq', 'technical', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'waiting_on_forecouriq', 'resolved', 'closed')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'operator', 'system')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled_globally BOOLEAN NOT NULL DEFAULT false,
  allowed_dealership_ids UUID[] NOT NULL DEFAULT '{}',
  allowed_plans TEXT[] NOT NULL DEFAULT '{}',
  is_beta BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Security Events Log
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success', 'login_failure', 'password_reset_requested', 'password_changed',
    'mfa_enabled', 'mfa_disabled', 'user_invited', 'user_deactivated', 'user_reactivated',
    'role_changed', 'support_session_started', 'pilot_started', 'pilot_paused'
  )),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Usage Metrics (Unit Economics)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  ai_tokens INTEGER NOT NULL DEFAULT 0,
  ai_cost_gbp NUMERIC(10,4) NOT NULL DEFAULT 0,
  dvla_lookups INTEGER NOT NULL DEFAULT 0,
  cap_valuations INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  storage_bytes_used BIGINT NOT NULL DEFAULT 0,
  estimated_cost_gbp NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dealership_id, date)
);

-- 12. Add pilot columns to dealerships table if not existing
ALTER TABLE dealerships
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'onboarding' CHECK (lifecycle_status IN ('prospect', 'onboarding', 'pilot', 'active', 'past_due', 'suspended', 'cancelled', 'archived')),
  ADD COLUMN IF NOT EXISTS pilot_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pilot_owner TEXT,
  ADD COLUMN IF NOT EXISTS pilot_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Add user active status if not existing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================
ALTER TABLE dealership_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Dealership Onboarding RLS
CREATE POLICY "Users can view their dealership onboarding"
  ON dealership_onboarding FOR SELECT
  USING (dealership_id = auth_dealership_id());

CREATE POLICY "Admins can update their dealership onboarding"
  ON dealership_onboarding FOR ALL
  USING (dealership_id = auth_dealership_id());

-- Data Import Jobs RLS
CREATE POLICY "Users can view their dealership import jobs"
  ON data_import_jobs FOR SELECT
  USING (dealership_id = auth_dealership_id());

CREATE POLICY "Users can create and manage their dealership import jobs"
  ON data_import_jobs FOR ALL
  USING (dealership_id = auth_dealership_id());

-- User Invitations RLS
CREATE POLICY "Users can view their dealership invitations"
  ON user_invitations FOR SELECT
  USING (dealership_id = auth_dealership_id());

CREATE POLICY "Admins can manage their dealership invitations"
  ON user_invitations FOR ALL
  USING (dealership_id = auth_dealership_id());

-- Dealership Plans RLS (Publicly readable)
CREATE POLICY "Plans are readable by authenticated users"
  ON dealership_plans FOR SELECT
  USING (auth.role() = 'authenticated');

-- Subscriptions RLS
CREATE POLICY "Users can view their dealership subscription"
  ON subscriptions FOR SELECT
  USING (dealership_id = auth_dealership_id());

-- Support Cases RLS
CREATE POLICY "Users can view their dealership support cases"
  ON support_cases FOR SELECT
  USING (dealership_id = auth_dealership_id());

CREATE POLICY "Users can create and update their dealership support cases"
  ON support_cases FOR ALL
  USING (dealership_id = auth_dealership_id());

-- Support Messages RLS
CREATE POLICY "Users can view messages for their dealership cases"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_cases
      WHERE support_cases.id = support_messages.case_id
      AND support_cases.dealership_id = auth_dealership_id()
    )
    AND is_internal_note = false
  );

CREATE POLICY "Users can post messages to their dealership cases"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_cases
      WHERE support_cases.id = support_messages.case_id
      AND support_cases.dealership_id = auth_dealership_id()
    )
    AND is_internal_note = false
  );

-- Feature Flags RLS
CREATE POLICY "Feature flags readable by authenticated users"
  ON feature_flags FOR SELECT
  USING (auth.role() = 'authenticated');

-- Usage Metrics RLS
CREATE POLICY "Users can view their dealership usage metrics"
  ON usage_metrics FOR SELECT
  USING (dealership_id = auth_dealership_id());
