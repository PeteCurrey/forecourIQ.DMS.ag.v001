-- ForecourIQ DMS — Phase 6 Dealer Website Engine
-- Migration 008_phase6_website.sql
--
-- Creates: dealer_websites, website_domains, website_pages,
--          website_redirects, website_events
-- Alters:  vehicles (adds website_slug, website_ready, website_description, featured)
-- RLS:     All tables tenant-isolated

-- ─── VEHICLE WEBSITE FIELDS ──────────────────────────────────────────────────

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS website_slug         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS website_ready        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS website_description  TEXT,
  ADD COLUMN IF NOT EXISTS featured             BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vehicles_website_ready
  ON public.vehicles(dealership_id, website_ready, status);

CREATE INDEX IF NOT EXISTS idx_vehicles_featured
  ON public.vehicles(dealership_id, featured);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_website_slug
  ON public.vehicles(website_slug) WHERE website_slug IS NOT NULL;

-- ─── DEALER WEBSITES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dealer_websites (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id                   UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Lifecycle
  status                          TEXT NOT NULL DEFAULT 'not_configured'
                                  CHECK (status IN (
                                    'not_configured','draft','ready',
                                    'publishing','live','update_pending','error','suspended'
                                  )),

  -- Theme
  theme_preset                    TEXT NOT NULL DEFAULT 'contemporary'
                                  CHECK (theme_preset IN (
                                    'performance','prestige','contemporary','minimal','classic'
                                  )),
  primary_colour                  TEXT DEFAULT '#0EA5E9',
  accent_colour                   TEXT DEFAULT '#F97316',
  background_preference           TEXT DEFAULT 'light'
                                  CHECK (background_preference IN ('light','dark','system')),
  font_heading                    TEXT DEFAULT 'Inter',
  font_body                       TEXT DEFAULT 'Inter',

  -- Brand assets
  logo_url                        TEXT,
  logo_dark_url                   TEXT,
  favicon_url                     TEXT,

  -- Hero
  hero_title                      TEXT,
  hero_subtitle                   TEXT,
  hero_cta_text                   TEXT DEFAULT 'View Our Stock',
  hero_cta_url                    TEXT DEFAULT '/used-cars',
  hero_image_url                  TEXT,

  -- Homepage section order & config (jsonb array of section objects)
  homepage_sections               JSONB DEFAULT '[]'::jsonb,

  -- Dealership proposition blocks
  proposition_headline            TEXT,
  proposition_body                TEXT,

  -- Stock settings
  reserved_vehicle_policy         TEXT DEFAULT 'show_reserved'
                                  CHECK (reserved_vehicle_policy IN (
                                    'show_reserved','hide','show_available_for_enquiry'
                                  )),
  show_registration               BOOLEAN DEFAULT FALSE,

  -- Finance
  online_reservations_enabled     BOOLEAN DEFAULT FALSE,
  reservation_deposit_amount      NUMERIC(10,2) DEFAULT 299.00,
  reservation_duration_hours      INTEGER DEFAULT 72,
  reservation_policy_text         TEXT,
  finance_display_mode            TEXT DEFAULT 'on_request'
                                  CHECK (finance_display_mode IN ('live','on_request','hidden')),

  -- Analytics
  ga4_measurement_id              TEXT,
  plausible_domain                TEXT,

  -- Social
  social_facebook                 TEXT,
  social_instagram                TEXT,
  social_twitter_x                TEXT,
  social_youtube                  TEXT,
  social_google_business          TEXT,

  -- Publish tracking
  published_at                    TIMESTAMPTZ,
  published_by                    UUID REFERENCES auth.users(id),
  last_updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  last_updated_by                 UUID REFERENCES auth.users(id),

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_dealer_websites_dealership UNIQUE (dealership_id)
);

CREATE INDEX IF NOT EXISTS idx_dealer_websites_tenant
  ON public.dealer_websites(dealership_id);

CREATE INDEX IF NOT EXISTS idx_dealer_websites_status
  ON public.dealer_websites(status);

-- ─── WEBSITE DOMAINS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.website_domains (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id   UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  website_id      UUID NOT NULL REFERENCES public.dealer_websites(id) ON DELETE CASCADE,

  domain          TEXT NOT NULL,
  is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN (
                    'pending','verification_required','verified',
                    'ssl_pending','active','error'
                  )),
  ssl_status      TEXT DEFAULT 'pending'
                  CHECK (ssl_status IN ('pending','provisioning','active','error','not_applicable')),

  dns_instructions JSONB DEFAULT '{}'::jsonb,
  verified_at      TIMESTAMPTZ,
  error_message    TEXT,
  redirect_to      TEXT,  -- www redirect target

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent two dealerships claiming the same active domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_domains_unique_active
  ON public.website_domains(domain)
  WHERE status IN ('verified','ssl_pending','active');

CREATE INDEX IF NOT EXISTS idx_website_domains_tenant
  ON public.website_domains(dealership_id);

CREATE INDEX IF NOT EXISTS idx_website_domains_lookup
  ON public.website_domains(domain, status);

-- ─── WEBSITE PAGES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.website_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id   UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  website_id      UUID NOT NULL REFERENCES public.dealer_websites(id) ON DELETE CASCADE,

  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  meta_title      TEXT,
  meta_description TEXT,
  page_type       TEXT NOT NULL DEFAULT 'custom'
                  CHECK (page_type IN (
                    'home','used_cars','finance','part_exchange',
                    'sell_your_car','about','contact',
                    'privacy','cookies','terms','custom'
                  )),
  sections        JSONB DEFAULT '[]'::jsonb,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published')),

  is_indexable    BOOLEAN DEFAULT TRUE,
  canonical_url   TEXT,

  published_at    TIMESTAMPTZ,
  published_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_website_pages_slug UNIQUE (website_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_website_pages_tenant
  ON public.website_pages(dealership_id, status);

-- ─── WEBSITE REDIRECTS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.website_redirects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id   UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  website_id      UUID NOT NULL REFERENCES public.dealer_websites(id) ON DELETE CASCADE,

  from_path       TEXT NOT NULL,
  to_path         TEXT NOT NULL,
  status_code     INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301,302)),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  note            TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_website_redirects_path UNIQUE (website_id, from_path)
);

CREATE INDEX IF NOT EXISTS idx_website_redirects_tenant
  ON public.website_redirects(dealership_id, is_active);

-- ─── WEBSITE EVENTS (first-party analytics) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.website_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id   UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id      UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  event_type      TEXT NOT NULL
                  CHECK (event_type IN (
                    'vehicle_view','search','enquiry_started','enquiry_submitted',
                    'px_started','px_submitted','finance_started','reservation_started',
                    'reservation_completed','phone_click','email_click',
                    'whatsapp_click','page_view','cta_click'
                  )),

  session_id      TEXT,
  source          TEXT,        -- dealer_website, google, direct, etc.
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  referrer        TEXT,
  landing_page    TEXT,
  page_url        TEXT,

  metadata        JSONB DEFAULT '{}'::jsonb,  -- search filters, vehicle slug, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_events_dealership_type
  ON public.website_events(dealership_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_events_vehicle
  ON public.website_events(vehicle_id, event_type);

CREATE INDEX IF NOT EXISTS idx_website_events_created
  ON public.website_events(dealership_id, created_at DESC);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE public.dealer_websites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_domains    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_redirects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_events     ENABLE ROW LEVEL SECURITY;

-- Authenticated dealership users access their own data
CREATE POLICY "dealer_websites_tenant_isolation" ON public.dealer_websites
  FOR ALL USING (
    dealership_id = (
      SELECT dealership_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "website_domains_tenant_isolation" ON public.website_domains
  FOR ALL USING (
    dealership_id = (
      SELECT dealership_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "website_pages_tenant_isolation" ON public.website_pages
  FOR ALL USING (
    dealership_id = (
      SELECT dealership_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "website_redirects_tenant_isolation" ON public.website_redirects
  FOR ALL USING (
    dealership_id = (
      SELECT dealership_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "website_events_tenant_isolation" ON public.website_events
  FOR ALL USING (
    dealership_id = (
      SELECT dealership_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

-- Service role can insert events from public API routes (unauthenticated requests)
CREATE POLICY "website_events_service_insert" ON public.website_events
  FOR INSERT WITH CHECK (true);

-- ─── DEFAULT HOMEPAGE SECTIONS ────────────────────────────────────────────────

-- Function to create a default website config for a dealership
CREATE OR REPLACE FUNCTION public.create_default_website(p_dealership_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_website_id UUID;
BEGIN
  INSERT INTO public.dealer_websites (
    dealership_id,
    status,
    theme_preset,
    homepage_sections
  ) VALUES (
    p_dealership_id,
    'not_configured',
    'contemporary',
    '[
      {"type":"hero","enabled":true,"order":1},
      {"type":"search","enabled":true,"order":2},
      {"type":"featured_vehicles","enabled":true,"order":3},
      {"type":"proposition","enabled":true,"order":4},
      {"type":"finance_cta","enabled":true,"order":5},
      {"type":"px_cta","enabled":true,"order":6},
      {"type":"location","enabled":true,"order":7}
    ]'::jsonb
  )
  ON CONFLICT (dealership_id) DO NOTHING
  RETURNING id INTO v_website_id;

  RETURN v_website_id;
END;
$$;
