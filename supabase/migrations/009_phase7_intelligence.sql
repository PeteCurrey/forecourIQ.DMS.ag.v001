-- ============================================================================
-- FORECOURTIQ DMS — PHASE 7 MIGRATION: COMMERCIAL INTELLIGENCE LAYER
-- (Market Intelligence, Buying Intelligence, Pricing Intelligence & Competitors)
-- ============================================================================

-- ─── 1. VEHICLE CLUSTERS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vehicle_clusters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id   UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  cluster_code    TEXT NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  generation      TEXT,
  derivative      TEXT,
  fuel_type       TEXT,
  transmission    TEXT,
  body_type       TEXT,
  year_min        INTEGER,
  year_max        INTEGER,
  mileage_band    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vehicle_clusters_dealership_code UNIQUE (dealership_id, cluster_code)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_clusters_dealership ON public.vehicle_clusters(dealership_id, make, model);

-- ─── 2. MARKET OBSERVATIONS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_observations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id     UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  cluster_id        UUID REFERENCES public.vehicle_clusters(id) ON DELETE SET NULL,
  source_type       TEXT NOT NULL CHECK (source_type IN (
                      'first_party','licensed_external','public_authorised','dealer_entered','derived'
                    )),
  provider          TEXT NOT NULL,
  observation_type  TEXT NOT NULL CHECK (observation_type IN (
                      'listing','price_change','sale','demand_spike','valuation'
                    )),
  observed_price    NUMERIC(10,2),
  observed_mileage  INTEGER,
  confidence        TEXT DEFAULT 'medium' CHECK (confidence IN (
                      'high','medium','low','insufficient_data'
                    )),
  observed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_observations_lookup ON public.market_observations(dealership_id, provider, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_observations_cluster ON public.market_observations(cluster_id, observed_at DESC);

-- ─── 3. MARKET SUPPLY SNAPSHOTS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_supply_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id           UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  cluster_id              UUID REFERENCES public.vehicle_clusters(id) ON DELETE SET NULL,
  internal_stock_count    INTEGER DEFAULT 0,
  external_listing_count  INTEGER DEFAULT 0,
  avg_asking_price        NUMERIC(10,2),
  median_asking_price     NUMERIC(10,2),
  snapshot_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_supply_lookup ON public.market_supply_snapshots(dealership_id, snapshot_date DESC);

-- ─── 4. BUYING SIGNALS (UPGRADE SCHEMA) ───────────────────────────────────────

-- Drop old schema table if it was bare stub, or alter appropriately
CREATE TABLE IF NOT EXISTS public.buying_signals_p7 (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id           UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  cluster_id              UUID REFERENCES public.vehicle_clusters(id) ON DELETE SET NULL,

  make                    TEXT NOT NULL,
  model                   TEXT NOT NULL,
  variant                 TEXT,
  year_min                INTEGER,
  year_max                INTEGER,
  fuel_type               TEXT,
  mileage_max             INTEGER,

  target_buy_price        NUMERIC(10,2),
  maximum_buy_price       NUMERIC(10,2),
  estimated_retail_price  NUMERIC(10,2),
  estimated_prep_cost     NUMERIC(10,2) DEFAULT 450.00,
  estimated_gross         NUMERIC(10,2),
  estimated_days_to_sale  INTEGER,

  demand_score            INTEGER DEFAULT 50,
  confidence              TEXT DEFAULT 'medium' CHECK (confidence IN (
                            'high','medium','low','insufficient_data'
                          )),
  opportunity_rating      TEXT DEFAULT 'potential' CHECK (opportunity_rating IN (
                            'strong','potential','watch','insufficient_data'
                          )),

  dimension_scores        JSONB DEFAULT '{}'::jsonb,
  reasons                 TEXT[] DEFAULT '{}',
  evidence                JSONB DEFAULT '[]'::jsonb,

  status                  TEXT DEFAULT 'new' CHECK (status IN (
                            'new','reviewed','watching','accepted','dismissed','expired','converted_to_acquisition'
                          )),

  acquired_vehicle_id     UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  actual_purchase_price   NUMERIC(10,2),
  actual_sold_price       NUMERIC(10,2),
  actual_gross            NUMERIC(10,2),
  actual_days_to_sale     INTEGER,

  dismissed_reason        TEXT,
  dismissed_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  model_version           TEXT DEFAULT 'v1.0',
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade existing buying_signals table or use new canonical columns
ALTER TABLE public.buying_signals
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.vehicle_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant TEXT,
  ADD COLUMN IF NOT EXISTS maximum_buy_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS estimated_prep_cost NUMERIC(10,2) DEFAULT 450.00,
  ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS opportunity_rating TEXT DEFAULT 'potential',
  ADD COLUMN IF NOT EXISTS dimension_scores JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acquired_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_purchase_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_sold_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_gross NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_days_to_sale INTEGER,
  ADD COLUMN IF NOT EXISTS dismissed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_buying_signals_tenant_status ON public.buying_signals(dealership_id, status);
CREATE INDEX IF NOT EXISTS idx_buying_signals_make_model ON public.buying_signals(dealership_id, make, model);

-- ─── 5. BUYING WATCHLIST ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.buying_watchlist (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  make                  TEXT NOT NULL,
  model                 TEXT NOT NULL,
  variant               TEXT,
  year_min              INTEGER,
  year_max              INTEGER,
  fuel_type             TEXT,
  max_mileage           INTEGER,
  target_buy_price      NUMERIC(10,2),
  target_retail_price   NUMERIC(10,2),
  notes                 TEXT,
  owner_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','expired','paused')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buying_watchlist_tenant ON public.buying_watchlist(dealership_id, status);

-- ─── 6. PRICING SIGNALS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pricing_signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id            UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

  current_price         NUMERIC(10,2) NOT NULL,
  recommended_price     NUMERIC(10,2),
  recommended_change    NUMERIC(10,2),

  signal_type           TEXT NOT NULL CHECK (signal_type IN (
                          'review_price','over_market','under_market','ageing_stock',
                          'high_demand_hold','low_engagement','high_views_low_leads',
                          'high_leads_no_deal','margin_erosion'
                        )),
  priority              TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  confidence            TEXT DEFAULT 'medium' CHECK (confidence IN ('high','medium','low','insufficient_data')),

  market_position_pct   NUMERIC(5,2),
  comparable_count      INTEGER DEFAULT 0,
  reason_summary        TEXT NOT NULL,
  evidence              JSONB DEFAULT '[]'::jsonb,

  status                TEXT DEFAULT 'active' CHECK (status IN ('active','applied','dismissed','expired')),
  applied_at            TIMESTAMPTZ,
  applied_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dismissed_reason      TEXT,
  dismissed_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  model_version         TEXT DEFAULT 'v1.0',
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_signals_lookup ON public.pricing_signals(dealership_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_pricing_signals_vehicle ON public.pricing_signals(vehicle_id);

-- ─── 7. STOCK RISK SIGNALS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stock_risk_signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id            UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

  risk_type             TEXT NOT NULL CHECK (risk_type IN (
                          'ageing_capital','margin_erosion','prep_delay','low_demand','high_exposure'
                        )),
  capital_invested      NUMERIC(10,2) NOT NULL,
  days_in_stock         INTEGER NOT NULL,
  projected_gross_loss  NUMERIC(10,2) DEFAULT 0,
  severity              TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  reasons               TEXT[] DEFAULT '{}',
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_risk_lookup ON public.stock_risk_signals(dealership_id, severity, days_in_stock DESC);
CREATE INDEX IF NOT EXISTS idx_stock_risk_vehicle ON public.stock_risk_signals(vehicle_id);

-- ─── 8. COMPETITORS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  website               TEXT,
  location              TEXT,
  distance_miles        NUMERIC(5,1),
  source_status         TEXT DEFAULT 'unavailable' CHECK (source_status IN ('active','source_required','unavailable')),
  source_provider       TEXT,
  notes                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_tenant ON public.competitors(dealership_id, is_active);

-- ─── 9. COMPETITOR VEHICLE OBSERVATIONS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_vehicle_observations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  competitor_id         UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,

  vehicle_reference     TEXT,
  registration          TEXT,
  make                  TEXT NOT NULL,
  model                 TEXT NOT NULL,
  derivative            TEXT,
  year                  INTEGER,
  mileage               INTEGER,
  price                 NUMERIC(10,2) NOT NULL,

  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT DEFAULT 'observed' CHECK (status IN ('observed','no_longer_observed')),
  price_history         JSONB DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_obs_lookup ON public.competitor_vehicle_observations(competitor_id, status);
CREATE INDEX IF NOT EXISTS idx_competitor_obs_tenant ON public.competitor_vehicle_observations(dealership_id, make, model);

-- ─── 10. COMPETITOR STOCK SNAPSHOTS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_stock_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  competitor_id         UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  stock_count           INTEGER NOT NULL DEFAULT 0,
  avg_price             NUMERIC(10,2),
  median_price          NUMERIC(10,2),
  make_mix              JSONB DEFAULT '{}'::jsonb,
  price_band_mix        JSONB DEFAULT '{}'::jsonb,
  snapshot_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_lookup ON public.competitor_stock_snapshots(competitor_id, snapshot_date DESC);

-- ─── 11. INTELLIGENCE RUNS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.intelligence_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id         UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  run_type              TEXT NOT NULL CHECK (run_type IN (
                          'buying_recalc','pricing_recalc','risk_recalc','competitor_refresh','market_snapshot'
                        )),
  status                TEXT DEFAULT 'completed' CHECK (status IN ('queued','running','completed','failed')),
  model_version         TEXT DEFAULT 'v1.0',
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  metrics_calculated    INTEGER DEFAULT 0,
  error_message         TEXT
);

CREATE INDEX IF NOT EXISTS idx_intelligence_runs_tenant ON public.intelligence_runs(dealership_id, run_type, started_at DESC);

-- ─── 12. DEALERSHIP INTELLIGENCE SETTINGS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dealership_intelligence_settings (
  dealership_id                       UUID PRIMARY KEY REFERENCES public.dealerships(id) ON DELETE CASCADE,
  target_gross_amount                 NUMERIC(10,2) DEFAULT 3000.00,
  minimum_gross_amount                NUMERIC(10,2) DEFAULT 1500.00,
  target_gross_pct                    NUMERIC(5,2) DEFAULT 12.00,
  max_stock_age_days                  INTEGER DEFAULT 60,
  urgent_stock_age_days               INTEGER DEFAULT 90,
  default_geo_radius_miles            INTEGER DEFAULT 50,
  preferred_makes                     TEXT[] DEFAULT '{}',
  excluded_makes                      TEXT[] DEFAULT '{}',
  auto_price_approval_max_reduction   NUMERIC(10,2) DEFAULT 500.00,
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 13. ROW LEVEL SECURITY ───────────────────────────────────────────────────

ALTER TABLE public.vehicle_clusters                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_observations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_supply_snapshots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_signals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_watchlist                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_signals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_risk_signals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_vehicle_observations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_stock_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_runs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealership_intelligence_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_clusters_tenant_isolation" ON public.vehicle_clusters
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "market_observations_tenant_isolation" ON public.market_observations
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "market_supply_snapshots_tenant_isolation" ON public.market_supply_snapshots
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "buying_signals_tenant_isolation" ON public.buying_signals
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "buying_watchlist_tenant_isolation" ON public.buying_watchlist
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "pricing_signals_tenant_isolation" ON public.pricing_signals
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "stock_risk_signals_tenant_isolation" ON public.stock_risk_signals
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "competitors_tenant_isolation" ON public.competitors
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "competitor_vehicle_obs_tenant_isolation" ON public.competitor_vehicle_observations
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "competitor_snapshots_tenant_isolation" ON public.competitor_stock_snapshots
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "intelligence_runs_tenant_isolation" ON public.intelligence_runs
  FOR ALL USING (dealership_id = auth_dealership_id());

CREATE POLICY "intelligence_settings_tenant_isolation" ON public.dealership_intelligence_settings
  FOR ALL USING (dealership_id = auth_dealership_id());
