-- ==============================================================================
-- FORECOURTIQ DMS — PHASE 09R MIGRATION: TEAM CHAT & MULTI-SITE STOCK TRANSFERS
-- ==============================================================================

-- 1. Internal Team Chat Threads
CREATE TABLE IF NOT EXISTS internal_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('direct', 'channel', 'entity')),
  name TEXT,
  slug TEXT,
  entity_type TEXT CHECK (entity_type IN ('vehicle', 'lead', 'deal', 'customer', 'stock_transfer')),
  entity_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Internal Thread Members
CREATE TABLE IF NOT EXISTS internal_thread_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES internal_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

-- 3. Internal Messages
CREATE TABLE IF NOT EXISTS internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES internal_threads(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  reply_to_message_id UUID REFERENCES internal_messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Internal Message Mentions
CREATE TABLE IF NOT EXISTS internal_message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES internal_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Internal Message Attachments
CREATE TABLE IF NOT EXISTS internal_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES internal_messages(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  transfer_reference TEXT NOT NULL UNIQUE,
  origin_location_id UUID NOT NULL REFERENCES dealership_locations(id) ON DELETE RESTRICT,
  destination_location_id UUID NOT NULL REFERENCES dealership_locations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'scheduled', 'in_transit', 'received', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  scheduled_dispatch_at TIMESTAMPTZ,
  expected_arrival_at TIMESTAMPTZ,
  dispatched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  received_condition_notes TEXT,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  transfer_reason TEXT,
  transport_method TEXT DEFAULT 'internal_driver',
  transport_cost NUMERIC(10,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Stock Transfer Events Audit Log
CREATE TABLE IF NOT EXISTS stock_transfer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Permanent Vehicle Location History
CREATE TABLE IF NOT EXISTS vehicle_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES dealership_locations(id) ON DELETE SET NULL,
  to_location_id UUID NOT NULL REFERENCES dealership_locations(id) ON DELETE RESTRICT,
  transfer_id UUID REFERENCES stock_transfers(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_internal_threads_dealership ON internal_threads(dealership_id, type);
CREATE INDEX IF NOT EXISTS idx_internal_threads_entity ON internal_threads(dealership_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_thread_members_user ON internal_thread_members(user_id, dealership_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_thread ON internal_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_internal_mentions_user ON internal_message_mentions(mentioned_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_vehicle ON stock_transfers(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_dealership ON stock_transfers(dealership_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_loc_history_vehicle ON vehicle_location_history(vehicle_id, changed_at);

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================
ALTER TABLE internal_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_location_history ENABLE ROW LEVEL SECURITY;

-- Threads: Visible to dealership members
CREATE POLICY "internal_threads_tenant_isolation" ON internal_threads
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Thread Members: Visible within same dealership
CREATE POLICY "internal_thread_members_tenant_isolation" ON internal_thread_members
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Messages: Visible within same dealership
CREATE POLICY "internal_messages_tenant_isolation" ON internal_messages
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Mentions: Visible to mentioned user and dealership
CREATE POLICY "internal_mentions_tenant_isolation" ON internal_message_mentions
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Attachments: Visible within dealership
CREATE POLICY "internal_attachments_tenant_isolation" ON internal_message_attachments
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Stock Transfers: Isolated per dealership
CREATE POLICY "stock_transfers_tenant_isolation" ON stock_transfers
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Stock Transfer Events
CREATE POLICY "stock_transfer_events_tenant_isolation" ON stock_transfer_events
  FOR ALL USING (dealership_id = auth_dealership_id());

-- Vehicle Location History
CREATE POLICY "vehicle_location_history_tenant_isolation" ON vehicle_location_history
  FOR ALL USING (dealership_id = auth_dealership_id());
