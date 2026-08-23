-- ============================================================================
-- Migration 013: Phase 10 — Product Analytics, Dealer Feedback & Release Candidate Pilot Controls
-- ============================================================================

-- 1. Product Analytics Telemetry
CREATE TABLE IF NOT EXISTS product_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_dealership_event ON product_analytics_events(dealership_id, event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON product_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_category ON product_analytics_events(event_category);

-- 2. Dealership Activation Milestones
CREATE TABLE IF NOT EXISTS dealership_activation_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  elapsed_seconds_from_signup BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_dealership_milestone UNIQUE (dealership_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_milestones_dealership ON dealership_activation_milestones(dealership_id);

-- 3. In-App Dealer Feedback
CREATE TABLE IF NOT EXISTS dealer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'confusing', 'feature_request', 'performance', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  route TEXT,
  app_version TEXT NOT NULL DEFAULT '1.0.0-rc.1',
  user_role TEXT,
  browser_info TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'planned', 'resolved', 'closed')),
  release_tag TEXT,
  operator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_dealership ON dealer_feedback(dealership_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON dealer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON dealer_feedback(created_at);

-- 4. Extend Dealerships with Pilot Risk and Objectives
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS pilot_risk_status TEXT NOT NULL DEFAULT 'healthy' CHECK (pilot_risk_status IN ('healthy', 'attention', 'at_risk', 'blocked'));
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS pilot_objectives JSONB DEFAULT '[]'::jsonb;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS pilot_success_criteria JSONB DEFAULT '[]'::jsonb;

-- 5. Enable Row Level Security
ALTER TABLE product_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealership_activation_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_feedback ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Analytics: Tenant insert & view own, platform operators view all
DROP POLICY IF EXISTS "Dealership users insert analytics" ON product_analytics_events;
CREATE POLICY "Dealership users insert analytics" ON product_analytics_events
  FOR INSERT WITH CHECK (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Dealership users view own analytics" ON product_analytics_events;
CREATE POLICY "Dealership users view own analytics" ON product_analytics_events
  FOR SELECT USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_operators WHERE user_id = auth.uid() AND is_active = true)
  );

-- Milestones: Tenant view own, platform operators view all
DROP POLICY IF EXISTS "Dealership users view own milestones" ON dealership_activation_milestones;
CREATE POLICY "Dealership users view own milestones" ON dealership_activation_milestones
  FOR SELECT USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_operators WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Dealership users insert milestones" ON dealership_activation_milestones;
CREATE POLICY "Dealership users insert milestones" ON dealership_activation_milestones
  FOR INSERT WITH CHECK (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

-- Feedback: Tenant insert & view own, platform operators manage all
DROP POLICY IF EXISTS "Dealership users insert feedback" ON dealer_feedback;
CREATE POLICY "Dealership users insert feedback" ON dealer_feedback
  FOR INSERT WITH CHECK (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Dealership users view own feedback" ON dealer_feedback;
CREATE POLICY "Dealership users view own feedback" ON dealer_feedback
  FOR SELECT USING (
    dealership_id IN (SELECT dealership_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_operators WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Platform operators update feedback" ON dealer_feedback;
CREATE POLICY "Platform operators update feedback" ON dealer_feedback
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM platform_operators WHERE user_id = auth.uid() AND is_active = true)
  );
