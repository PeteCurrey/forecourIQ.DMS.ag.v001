-- ============================================================================
-- FORECOURTIQ DMS — PHASE 8: IQ OPERATING LAYER MIGRATION
-- Daily Briefing, Command Centre, Proactive Recommendations, Controlled AI Actions & Automation
-- ============================================================================

-- 1. Daily & Weekly Briefings Table
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  briefing_type TEXT NOT NULL DEFAULT 'daily' CHECK (briefing_type IN ('daily', 'weekly')),
  summary TEXT NOT NULL,
  structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_provider TEXT NOT NULL DEFAULT 'anthropic',
  model_name TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_briefing_per_dealership_day_type UNIQUE (dealership_id, briefing_date, briefing_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_dealership_date ON daily_briefings(dealership_id, briefing_date DESC);

-- 2. AI Proactive Recommendations Table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('sales', 'stock', 'buying', 'pricing', 'preparation', 'deal', 'compliance', 'website', 'advertising', 'integration')),
  entity_type TEXT,
  entity_id UUID,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low', 'unverified')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'accepted', 'dismissed', 'action_pending', 'action_completed', 'expired')),
  fingerprint TEXT NOT NULL,
  source_signal_id UUID,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_action JSONB,
  expires_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  outcome JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_dealership_status ON ai_recommendations(dealership_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_fingerprint ON ai_recommendations(dealership_id, fingerprint);

-- 3. Controlled AI Actions Table (IQ Act)
CREATE TABLE IF NOT EXISTS ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES ai_recommendations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'awaiting_approval' CHECK (status IN ('draft', 'awaiting_approval', 'approved', 'executing', 'completed', 'failed', 'rejected', 'cancelled', 'expired')),
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  execution_started_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  result_reference JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_dealership_status ON ai_actions(dealership_id, status);

-- 4. Dealership IQ Strategy & Automation Settings
CREATE TABLE IF NOT EXISTS dealership_iq_settings (
  dealership_id UUID PRIMARY KEY REFERENCES dealerships(id) ON DELETE CASCADE,
  iq_enabled BOOLEAN NOT NULL DEFAULT true,
  default_action_mode TEXT NOT NULL DEFAULT 'assist' CHECK (default_action_mode IN ('suggest', 'assist', 'controlled_automation')),
  automation_paused BOOLEAN NOT NULL DEFAULT false,
  briefing_time TIME NOT NULL DEFAULT '08:00:00',
  briefing_email BOOLEAN NOT NULL DEFAULT false,
  briefing_days TEXT[] NOT NULL DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat']::TEXT[],
  action_policies JSONB NOT NULL DEFAULT '{
    "lead.create_followup": {"mode": "auto", "allowed_roles": ["admin", "manager", "sales"]},
    "task.create": {"mode": "auto", "allowed_roles": ["admin", "manager", "sales"]},
    "appointment.create": {"mode": "assist", "allowed_roles": ["admin", "manager", "sales"]},
    "pricing.prepare_change": {"mode": "assist", "allowed_roles": ["admin", "manager"]},
    "vehicle.price_change": {"mode": "approval_required", "allowed_roles": ["admin", "manager"]}
  }'::jsonb,
  monitoring_rules JSONB NOT NULL DEFAULT '{
    "unanswered_lead_threshold_minutes": 45,
    "overdue_followup_hours": 48,
    "ageing_stock_review_days": 60,
    "urgent_stock_review_days": 90
  }'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI Conversations & Messages (Audit & Multi-turn support)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Dealership Intelligence Query',
  context_entity_type TEXT,
  context_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  suggested_actions JSONB DEFAULT '[]'::jsonb,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, created_at ASC);

-- 6. AI Usage & Cost Observability Logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  capability TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  estimated_cost_gbp NUMERIC(8, 4) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rate_limited', 'fallback_used')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_dealership ON ai_usage_logs(dealership_id, created_at DESC);

-- Enable RLS on all Phase 8 tables
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealership_iq_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies (Strict Dealership Tenancy via auth.uid())
CREATE POLICY "Tenant isolation: daily_briefings"
  ON daily_briefings FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation: ai_recommendations"
  ON ai_recommendations FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation: ai_actions"
  ON ai_actions FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation: dealership_iq_settings"
  ON dealership_iq_settings FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation: ai_conversations"
  ON ai_conversations FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation: ai_messages"
  ON ai_messages FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation: ai_usage_logs"
  ON ai_usage_logs FOR ALL
  USING (dealership_id = (SELECT dealership_id FROM profiles WHERE id = auth.uid()));
