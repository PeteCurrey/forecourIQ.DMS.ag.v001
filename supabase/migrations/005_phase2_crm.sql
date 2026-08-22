-- ============================================================================
-- FORECOURTIQ DMS — PHASE 2 MIGRATION: CRM, CONVERSATIONS & SALES PIPELINE
-- ============================================================================

-- 1. EXTEND LEADS TABLE WITH CANONICAL CRM ATTRIBUTES
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'unknown' CHECK (temperature IN ('hot', 'warm', 'cold', 'unknown')),
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web' CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'web', 'social', 'walk_in', 'internal')),
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_description text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS close_notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update lead status check constraint to support full 13-stage pipeline
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'new',
    'unassigned',
    'contact_attempted',
    'contacted',
    'qualified',
    'appointment_booked',
    'appointment_completed',
    'proposal_required',
    'deal_ready',
    'nurture',
    'won',
    'lost',
    'closed'
  )
);

-- 2. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'web', 'social', 'internal')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting_customer', 'waiting_dealer', 'closed', 'archived')),
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject text,
  last_message_preview text,
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal_note')),
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'web', 'internal')),
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'customer', 'system')),
  sender_id text,
  sender_name text,
  recipient text,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'delivered' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  failed_reason text,
  external_message_id text,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. CALL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number text,
  duration_seconds integer DEFAULT 0,
  outcome text NOT NULL CHECK (outcome IN ('connected', 'left_voicemail', 'no_answer', 'busy', 'wrong_number', 'call_back_requested')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. LEAD STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 6. LEAD ASSIGNMENT HISTORY
CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 7. INDEXES FOR HIGH-THROUGHPUT CRM QUERYING
CREATE INDEX IF NOT EXISTS idx_leads_dealership_status ON public.leads(dealership_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_dealership_assigned ON public.leads(dealership_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_dealership_next_action ON public.leads(dealership_id, next_action_at);
CREATE INDEX IF NOT EXISTS idx_leads_dealership_created ON public.leads(dealership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_dealership ON public.conversations(dealership_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs(lead_id, created_at DESC);

-- 8. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_tenant_isolation" ON public.conversations
  FOR ALL USING (dealership_id = auth_dealership_id())
  WITH CHECK (dealership_id = auth_dealership_id());

CREATE POLICY "messages_tenant_isolation" ON public.messages
  FOR ALL USING (dealership_id = auth_dealership_id())
  WITH CHECK (dealership_id = auth_dealership_id());

CREATE POLICY "call_logs_tenant_isolation" ON public.call_logs
  FOR ALL USING (dealership_id = auth_dealership_id())
  WITH CHECK (dealership_id = auth_dealership_id());

CREATE POLICY "lead_status_history_tenant_isolation" ON public.lead_status_history
  FOR ALL USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND leads.dealership_id = auth_dealership_id()));

CREATE POLICY "lead_assignment_history_tenant_isolation" ON public.lead_assignment_history
  FOR ALL USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_assignment_history.lead_id AND leads.dealership_id = auth_dealership_id()));
