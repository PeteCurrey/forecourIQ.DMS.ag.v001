-- ============================================================================
-- Migration 014: Phase 10R — Intelligent Notifications & User Preferences
-- ============================================================================

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sales', 'stock', 'deals', 'transfers', 'team', 'compliance', 'iq', 'system')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  fingerprint TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_dealership ON public.notifications(dealership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_fingerprint ON public.notifications(dealership_id, fingerprint);

-- 2. User Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  sales_enabled BOOLEAN NOT NULL DEFAULT true,
  stock_enabled BOOLEAN NOT NULL DEFAULT true,
  deals_enabled BOOLEAN NOT NULL DEFAULT true,
  transfers_enabled BOOLEAN NOT NULL DEFAULT true,
  team_enabled BOOLEAN NOT NULL DEFAULT true,
  compliance_enabled BOOLEAN NOT NULL DEFAULT true,
  iq_enabled BOOLEAN NOT NULL DEFAULT true,
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_notification_prefs UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "notifications_tenant_isolation" ON public.notifications;
CREATE POLICY "notifications_tenant_isolation" ON public.notifications
  FOR ALL USING (
    dealership_id = auth_dealership_id()
    AND (user_id IS NULL OR user_id = auth.uid() OR EXISTS (SELECT 1 FROM platform_operators WHERE user_id = auth.uid() AND is_active = true))
  );

DROP POLICY IF EXISTS "notification_prefs_user_isolation" ON public.notification_preferences;
CREATE POLICY "notification_prefs_user_isolation" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());
