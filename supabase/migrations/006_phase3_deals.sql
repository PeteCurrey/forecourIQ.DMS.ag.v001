-- ============================================================================
-- FORECOURTIQ DMS — PHASE 3 MIGRATION: DEAL DESK, PART EXCHANGE, DEPOSITS,
-- FINANCE & HANDOVER (006_phase3_deals.sql)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND DEALS TABLE — Replace thin Phase 0 stub with full canonical schema
-- ----------------------------------------------------------------------------

-- Deal reference sequence (dealership-scoped friendly ref: FIQ-YYYY-NNNNNN)
CREATE SEQUENCE IF NOT EXISTS deal_ref_seq START 1 INCREMENT 1;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_reference text UNIQUE,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.dealership_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Commercial
  ADD COLUMN IF NOT EXISTS vehicle_retail_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agreed_vehicle_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS discounted_at timestamptz,
  -- Products/extras totals (from deal_line_items)
  ADD COLUMN IF NOT EXISTS products_total numeric(12,2) DEFAULT 0,
  -- Part exchange totals (denormalised from part_exchanges)
  ADD COLUMN IF NOT EXISTS part_exchange_total numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_exchange_settlement numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_exchange_equity numeric(12,2) DEFAULT 0,
  -- Finance/payment split
  ADD COLUMN IF NOT EXISTS cash_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash'
    CHECK (payment_method IN ('cash','bank_transfer','card','finance','mixed','other')),
  -- Deposit
  ADD COLUMN IF NOT EXISTS deposit_required numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid numeric(10,2) DEFAULT 0,
  -- Margin (actual set on completion only)
  ADD COLUMN IF NOT EXISTS gross_margin_projected numeric(12,2),
  ADD COLUMN IF NOT EXISTS gross_margin_actual numeric(12,2),
  -- Key timestamps
  ADD COLUMN IF NOT EXISTS deal_created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  -- Cancellation
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Metadata
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Remove old thin status constraint, replace with canonical 13-stage model
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_status_check CHECK (
  status IN (
    'draft','proposal','negotiation','agreed','awaiting_deposit',
    'reserved','finance_pending','documentation','pre_handover',
    'handover_ready','completed','cancelled','lost'
  )
);

-- Set existing deals to have a deal_reference if null
UPDATE public.deals
SET deal_reference = 'FIQ-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(deal_number::text, 6, '0')
WHERE deal_reference IS NULL;

-- ----------------------------------------------------------------------------
-- 2. DEAL STATUS HISTORY
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. DEAL PROPOSALS (versioned negotiation snapshots)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','presented','accepted','rejected','superseded')),
  -- Snapshot of commercial figures at time of proposal
  vehicle_retail_price numeric(12,2) DEFAULT 0,
  vehicle_selling_price numeric(12,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  products_total numeric(12,2) DEFAULT 0,
  customer_purchase_total numeric(12,2) DEFAULT 0,
  px_allowance numeric(12,2) DEFAULT 0,
  px_settlement numeric(12,2) DEFAULT 0,
  px_equity numeric(12,2) DEFAULT 0,
  deposit numeric(10,2) DEFAULT 0,
  finance_amount numeric(12,2) DEFAULT 0,
  balance_to_fund numeric(12,2) DEFAULT 0,
  -- Metadata
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  presented_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. DEAL APPROVALS (discount/cancellation/override workflow)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('discount','cancellation','price_override','other')),
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_at timestamptz,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. DEAL LINE ITEMS (products, accessories, warranties, delivery)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('warranty','paint_protection','service_plan','accessory','delivery','other')),
  description text NOT NULL,
  customer_price numeric(10,2) NOT NULL DEFAULT 0,
  dealer_cost numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  tax_treatment text DEFAULT 'standard', -- standard, exempt, zero_rated, margin_scheme
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. PART EXCHANGES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.part_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Vehicle identity
  registration text NOT NULL,
  vin text,
  make text,
  model text,
  derivative text,
  year integer,
  mileage integer,
  colour text,
  fuel_type text,
  transmission text,
  -- Condition & history
  condition text DEFAULT 'unknown' CHECK (condition IN ('excellent','good','fair','poor','unknown')),
  service_history text DEFAULT 'unknown' CHECK (service_history IN ('full','partial','none','unknown')),
  keys_count integer DEFAULT 1,
  mot_status text DEFAULT 'unknown' CHECK (mot_status IN ('valid','expired','unknown','advisory')),
  mot_expiry date,
  warning_lights boolean DEFAULT false,
  notes text,
  -- Appraisal areas (jsonb: {bodywork, wheels, tyres, interior, glass, mechanical, warning_lights} each: good/attention/poor/unknown + notes)
  appraisal jsonb DEFAULT '{}'::jsonb,
  -- Photos
  photos text[] DEFAULT '{}',
  photo_paths text[] DEFAULT '{}',
  -- Valuation
  customer_expectation numeric(10,2),
  trade_value numeric(10,2),
  retail_estimate numeric(10,2),
  allowance numeric(10,2) DEFAULT 0,
  valuation_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  valuation_at timestamptz,
  valuation_provider text, -- 'manual', 'cap_hpi', 'glass', 'motorcheck', other
  valuation_reference text,
  valuation_data jsonb DEFAULT '{}'::jsonb,
  -- Finance settlement
  finance_outstanding boolean DEFAULT false,
  finance_provider text,
  settlement_amount numeric(10,2) DEFAULT 0,
  settlement_reference text,
  settlement_valid_until date,
  settlement_document_path text,
  settlement_status text DEFAULT 'unknown'
    CHECK (settlement_status IN ('unknown','requested','received','confirmed','paid','not_applicable')),
  -- Status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','appraised','accepted','rejected','acquired_to_stock')),
  -- If accepted and acquired, link to new stock vehicle
  acquired_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  -- Audit
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. RESERVATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  salesperson_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','expired','cancelled','converted_to_sale')),
  deposit_amount numeric(10,2) DEFAULT 0,
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancellation_reason text,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- CRITICAL: Prevent two active reservations for the same vehicle
-- This is enforced at DB level, not just UI
CREATE UNIQUE INDEX IF NOT EXISTS reservations_vehicle_active_unique_idx
  ON public.reservations (vehicle_id)
  WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- 8. PAYMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'sales_deposit'
    CHECK (category IN ('reservation_deposit','sales_deposit','balance_payment','refund','other')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  method text NOT NULL DEFAULT 'card'
    CHECK (method IN ('card','bank_transfer','cash','finance','other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','recorded','verified','failed','refunded','partially_refunded')),
  -- Clearly distinguishes manually entered payments from provider-verified ones
  is_manually_recorded boolean NOT NULL DEFAULT true,
  -- Provider integration
  provider text DEFAULT 'manual'
    CHECK (provider IN ('stripe','manual','other')),
  provider_reference text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_checkout_session_id text,
  -- Timestamps
  received_at timestamptz,
  refunded_at timestamptz,
  refunded_amount numeric(12,2),
  refund_reason text,
  refund_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  receipt_generated_at timestamptz,
  -- Audit
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Idempotency: prevent double-processing a Stripe event
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_intent_idx
  ON public.payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_idx
  ON public.payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. FINANCE PROPOSALS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Provider info
  provider text,
  product_type text DEFAULT 'hp'
    CHECK (product_type IN ('hp','pcp','bch','personal_loan','other')),
  -- Figures — ONLY populated from real provider responses or authorised manual input
  -- AI must NEVER populate these fields
  vehicle_price numeric(12,2) DEFAULT 0,
  deposit numeric(10,2) DEFAULT 0,
  px_equity numeric(12,2) DEFAULT 0,
  amount_to_finance numeric(12,2) DEFAULT 0,
  term_months integer,
  annual_mileage integer,
  apr numeric(6,4),        -- e.g. 0.0999 = 9.99%
  monthly_payment numeric(10,2),
  final_payment numeric(10,2),
  -- Status
  status text NOT NULL DEFAULT 'discussion'
    CHECK (status IN (
      'not_required','discussion','quote_requested','quote_received',
      'application_pending','submitted','approved','declined',
      'documents_required','activated','cancelled'
    )),
  is_manually_recorded boolean NOT NULL DEFAULT true,
  external_reference text,
  notes text,
  -- Timestamps
  submitted_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 10. DEAL DOCUMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  document_type text NOT NULL
    CHECK (document_type IN (
      'proposal','order_form','invoice','deposit_receipt',
      'part_exchange_appraisal','finance_document','settlement_letter',
      'id_document','compliance_document','handover_document','other'
    )),
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  mime_type text DEFAULT 'application/pdf',
  template_type text,
  template_version text,
  checksum text,
  is_customer_facing boolean DEFAULT false,
  notes text,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 11. DEAL INVOICES
-- ----------------------------------------------------------------------------

-- Per-dealership invoice number sequence via a counter table
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  dealership_id uuid PRIMARY KEY REFERENCES public.dealerships(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.deal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  issued_at timestamptz DEFAULT now(),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_treatment jsonb DEFAULT '{}'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','voided')),
  notes text,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(dealership_id, invoice_number)
);

-- Atomic function to get next invoice number (prevents duplicates under concurrency)
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_dealership_id uuid)
RETURNS text AS $$
DECLARE
  v_number integer;
  v_year text;
BEGIN
  INSERT INTO invoice_counters (dealership_id, last_number)
  VALUES (p_dealership_id, 1)
  ON CONFLICT (dealership_id) DO UPDATE
    SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO v_number;

  v_year := TO_CHAR(NOW(), 'YYYY');
  RETURN 'INV-' || v_year || '-' || LPAD(v_number::text, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 12. HANDOVER CHECKLISTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.handover_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  -- checklist_items: [{key, label, status (pending/complete/na), notes, completed_at, completed_by}]
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE public.deal_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_status_history_policy" ON public.deal_status_history
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_proposals_policy" ON public.deal_proposals
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_approvals_policy" ON public.deal_approvals
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_line_items_policy" ON public.deal_line_items
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "part_exchanges_policy" ON public.part_exchanges
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "reservations_policy" ON public.reservations
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "payments_policy" ON public.payments
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "finance_proposals_policy" ON public.finance_proposals
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_documents_policy" ON public.deal_documents
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "deal_invoices_policy" ON public.deal_invoices
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "invoice_counters_policy" ON public.invoice_counters
  FOR ALL USING (dealership_id = get_dealership_id());

CREATE POLICY "handover_checklists_policy" ON public.handover_checklists
  FOR ALL USING (dealership_id = get_dealership_id());

-- Service role can manage payments (for Stripe webhooks)
CREATE POLICY "service_role_payments" ON public.payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_deals" ON public.deals
  FOR ALL USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 14. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS deals_dealership_status_salesperson_idx ON public.deals(dealership_id, status, salesperson_id);
CREATE INDEX IF NOT EXISTS deals_dealership_created_idx ON public.deals(dealership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deals_reference_idx ON public.deals(deal_reference);
CREATE INDEX IF NOT EXISTS deals_handover_at_idx ON public.deals(dealership_id, handover_at) WHERE handover_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS deal_proposals_deal_idx ON public.deal_proposals(deal_id, version DESC);
CREATE INDEX IF NOT EXISTS deal_approvals_deal_pending_idx ON public.deal_approvals(deal_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS deal_line_items_deal_idx ON public.deal_line_items(deal_id);

CREATE INDEX IF NOT EXISTS part_exchanges_deal_idx ON public.part_exchanges(deal_id);
CREATE INDEX IF NOT EXISTS part_exchanges_dealership_status_idx ON public.part_exchanges(dealership_id, status);

CREATE INDEX IF NOT EXISTS reservations_vehicle_idx ON public.reservations(vehicle_id, status);
CREATE INDEX IF NOT EXISTS reservations_deal_idx ON public.reservations(deal_id);

CREATE INDEX IF NOT EXISTS payments_deal_idx ON public.payments(deal_id);
CREATE INDEX IF NOT EXISTS payments_dealership_status_idx ON public.payments(dealership_id, status);

CREATE INDEX IF NOT EXISTS finance_proposals_deal_idx ON public.finance_proposals(deal_id);
CREATE INDEX IF NOT EXISTS deal_documents_deal_idx ON public.deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS deal_invoices_deal_idx ON public.deal_invoices(deal_id);
CREATE INDEX IF NOT EXISTS handover_checklists_deal_idx ON public.handover_checklists(deal_id);
CREATE INDEX IF NOT EXISTS deal_status_history_deal_idx ON public.deal_status_history(deal_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 15. RBAC — PHASE 3 PERMISSIONS
-- ----------------------------------------------------------------------------

INSERT INTO permissions (id, category, name, description) VALUES
  ('deals.cancel', 'deals', 'Cancel Deal', 'Cancel an active deal with reason'),
  ('deals.complete', 'deals', 'Complete Deal', 'Mark a deal as completed and vehicle as sold'),
  ('deals.discount', 'deals', 'Apply Discount', 'Apply a discount to a deal'),
  ('deals.approve_discount', 'deals', 'Approve Discount', 'Approve discount requests above salesperson threshold'),
  ('part_exchange.read', 'deals', 'View Part Exchange', 'View part exchange details'),
  ('part_exchange.manage', 'deals', 'Manage Part Exchange', 'Create, edit and value part exchanges'),
  ('payments.read', 'deals', 'View Payments', 'View payment records and receipts'),
  ('payments.record', 'deals', 'Record Payment', 'Record manual payments and initiate Stripe deposits'),
  ('payments.refund', 'deals', 'Refund Payment', 'Authorise and process payment refunds'),
  ('handover.manage', 'deals', 'Manage Handover', 'Complete handover checklists and mark handovers done'),
  ('documents.generate', 'deals', 'Generate Documents', 'Generate order forms, invoices and receipts'),
  ('margin.read', 'deals', 'View Gross Margin', 'View vehicle cost and deal gross margin figures')
ON CONFLICT (id) DO UPDATE SET
  category = excluded.category,
  name = excluded.name,
  description = excluded.description;

-- Dealer Principal: all permissions (already granted via wildcard in 003)
-- Just ensure new ones are covered
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'dealer_principal', id FROM permissions
WHERE id IN (
  'deals.cancel','deals.complete','deals.discount','deals.approve_discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record','payments.refund',
  'handover.manage','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- Administrator: all except margin.read at their discretion (granting full admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'administrator', id FROM permissions
WHERE id IN (
  'deals.cancel','deals.complete','deals.discount','deals.approve_discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record','payments.refund',
  'handover.manage','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- Sales Manager: most deal operations including margin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'sales_manager', id FROM permissions
WHERE id IN (
  'deals.cancel','deals.complete','deals.discount','deals.approve_discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record',
  'handover.manage','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- Sales Executive: basic deal operations, NO margin.read, NO refunds, NO approval
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'sales_executive', id FROM permissions
WHERE id IN (
  'deals.discount',
  'part_exchange.read','part_exchange.manage',
  'payments.read','payments.record',
  'handover.manage','documents.generate'
)
ON CONFLICT DO NOTHING;

-- Finance/Compliance: read payments, generate docs
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'finance_compliance', id FROM permissions
WHERE id IN (
  'payments.read','documents.generate','margin.read'
)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 16. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deal_proposals_updated_at') THEN
    CREATE TRIGGER deal_proposals_updated_at BEFORE UPDATE ON public.deal_proposals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deal_approvals_updated_at') THEN
    CREATE TRIGGER deal_approvals_updated_at BEFORE UPDATE ON public.deal_approvals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deal_line_items_updated_at') THEN
    CREATE TRIGGER deal_line_items_updated_at BEFORE UPDATE ON public.deal_line_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'part_exchanges_updated_at') THEN
    CREATE TRIGGER part_exchanges_updated_at BEFORE UPDATE ON public.part_exchanges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reservations_updated_at') THEN
    CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payments_updated_at') THEN
    CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'finance_proposals_updated_at') THEN
    CREATE TRIGGER finance_proposals_updated_at BEFORE UPDATE ON public.finance_proposals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handover_checklists_updated_at') THEN
    CREATE TRIGGER handover_checklists_updated_at BEFORE UPDATE ON public.handover_checklists
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
