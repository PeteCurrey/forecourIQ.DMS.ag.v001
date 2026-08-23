/**
 * ForecourIQ DMS — Commercial Intelligence Domain Types (Phase 7)
 *
 * Truthful, deterministic data models for market demand, buying signals,
 * pricing attention, stock risk, competitor monitoring, and IQ explanation.
 */

// ─── SOURCE PROVENANCE & DATA QUALITY ────────────────────────────────────────

export type SourceCategory =
  | 'FIRST_PARTY'
  | 'LICENSED_EXTERNAL'
  | 'PUBLIC_AUTHORISED'
  | 'DEALER_ENTERED'
  | 'DERIVED'
  | 'UNCONFIGURED'
  | 'UNAVAILABLE'

export type DataQualityState =
  | 'complete'
  | 'partial'
  | 'stale'
  | 'invalid'
  | 'conflicting'
  | 'unavailable'

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient_data'

export interface ProvenanceMetadata {
  source_type: SourceCategory
  provider: string
  source_reference?: string | null
  observed_at: string
  effective_at?: string | null
  expires_at?: string | null
  is_stale: boolean
  data_quality: DataQualityState
  confidence: ConfidenceLevel
  calculation_version?: string
}

// ─── VEHICLE CLUSTER ─────────────────────────────────────────────────────────

export interface VehicleCluster {
  id?: string
  dealership_id?: string
  cluster_code: string
  make: string
  model: string
  generation?: string | null
  derivative?: string | null
  fuel_type?: string | null
  transmission?: string | null
  body_type?: string | null
  year_min?: number | null
  year_max?: number | null
  mileage_band?: string | null
}

// ─── MARKET INTELLIGENCE ─────────────────────────────────────────────────────

export interface MarketObservation {
  id: string
  dealership_id: string
  cluster_id?: string | null
  source_type: SourceCategory
  provider: string
  observation_type: 'listing' | 'price_change' | 'sale' | 'demand_spike' | 'valuation'
  observed_price?: number | null
  observed_mileage?: number | null
  confidence: ConfidenceLevel
  observed_at: string
  metadata?: Record<string, unknown>
}

export interface DemandMetric {
  searches_30d: number
  zero_result_searches_30d: number
  vehicle_views_30d: number
  enquiries_30d: number
  finance_starts_30d: number
  reservations_30d: number
  demand_index: number // 0-100 deterministic index
  trend_pct: number
}

export interface StockTurnMetric {
  segment: string
  sample_size: number
  is_low_sample: boolean
  median_days_to_sale: number
  average_days_to_sale: number
  median_actual_gross: number
  average_discount: number
  conversion_rate_pct: number
}

export interface MarketOverviewData {
  provenance: ProvenanceMetadata
  website_demand: DemandMetric
  internal_stock_count: number
  internal_capital_invested: number
  sales_velocity_30d: number
  median_turn_days: number
  low_stock_gap_count: number
  active_buying_signals_count: number
  pricing_reviews_count: number
  competitors_monitored_count: number
  external_source_status: 'operational' | 'unconfigured' | 'commercial_required' | 'stale'
}

// ─── BUYING INTELLIGENCE ─────────────────────────────────────────────────────

export type BuyingOpportunityRating = 'strong' | 'potential' | 'watch' | 'insufficient_data'

export type BuyingSignalStatus =
  | 'new'
  | 'reviewed'
  | 'watching'
  | 'accepted'
  | 'dismissed'
  | 'expired'
  | 'converted_to_acquisition'

export interface DimensionScores {
  dealer_history: number      // 0-100: historical turn & gross
  customer_demand: number     // 0-100: searches & lost leads
  stock_gap: number           // 0-100: 100 if 0 matching stock, 0 if stocked
  market_supply: number       // 0-100: availability vs competition
  margin_potential: number    // 0-100: projected gross vs target
}

export interface IntelligenceEvidenceItem {
  type: string
  label: string
  value: string | number
  source: string
  source_id?: string
  provenance: SourceCategory
  entity_link?: string
}

export interface BuyingSignal {
  id: string
  dealership_id: string
  cluster_id?: string | null
  make: string
  model: string
  variant?: string | null
  year_min?: number | null
  year_max?: number | null
  fuel_type?: string | null
  mileage_max?: number | null

  target_buy_price?: number | null
  maximum_buy_price?: number | null
  estimated_retail_price?: number | null
  estimated_prep_cost?: number | null
  estimated_gross?: number | null
  estimated_days_to_sale?: number | null

  demand_score: number
  confidence: ConfidenceLevel
  opportunity_rating: BuyingOpportunityRating

  dimension_scores: DimensionScores
  reasons: string[]
  evidence: IntelligenceEvidenceItem[]

  status: BuyingSignalStatus
  acquired_vehicle_id?: string | null
  actual_purchase_price?: number | null
  actual_sold_price?: number | null
  actual_gross?: number | null
  actual_days_to_sale?: number | null

  dismissed_reason?: string | null
  model_version: string
  expires_at?: string | null
  created_at: string
}

export interface BuyingWatchlistItem {
  id: string
  dealership_id: string
  make: string
  model: string
  variant?: string | null
  year_min?: number | null
  year_max?: number | null
  fuel_type?: string | null
  max_mileage?: number | null
  target_buy_price?: number | null
  target_retail_price?: number | null
  notes?: string | null
  owner_id?: string | null
  owner_name?: string | null
  status: 'active' | 'fulfilled' | 'expired' | 'paused'
  created_at: string
}

// ─── PRICING INTELLIGENCE ────────────────────────────────────────────────────

export type PricingSignalType =
  | 'review_price'
  | 'over_market'
  | 'under_market'
  | 'ageing_stock'
  | 'high_demand_hold'
  | 'low_engagement'
  | 'high_views_low_leads'
  | 'high_leads_no_deal'
  | 'margin_erosion'

export interface PricingSignal {
  id: string
  dealership_id: string
  vehicle_id: string
  vehicle_summary?: {
    registration: string
    make: string
    model: string
    variant?: string | null
    year: number
    days_in_stock: number
    primary_image_url?: string | null
  }

  current_price: number
  recommended_price?: number | null
  recommended_change?: number | null

  signal_type: PricingSignalType
  priority: 'critical' | 'high' | 'medium' | 'low'
  confidence: ConfidenceLevel

  market_position_pct?: number | null
  comparable_count: number
  reason_summary: string
  evidence: IntelligenceEvidenceItem[]

  status: 'active' | 'applied' | 'dismissed' | 'expired'
  applied_at?: string | null
  applied_by?: string | null
  dismissed_reason?: string | null
  model_version: string
  expires_at?: string | null
  created_at: string
}

// ─── STOCK RISK & CAPITAL EXPOSURE ───────────────────────────────────────────

export interface StockRiskSignal {
  id: string
  dealership_id: string
  vehicle_id: string
  vehicle_summary?: {
    registration: string
    make: string
    model: string
    year: number
    asking_price: number
  }
  risk_type: 'ageing_capital' | 'margin_erosion' | 'prep_delay' | 'low_demand' | 'high_exposure'
  capital_invested: number
  days_in_stock: number
  projected_gross_loss: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  reasons: string[]
  created_at: string
}

export interface CapitalExposureSummary {
  total_capital_invested: number
  under_30_days: { count: number; capital: number }
  days_31_to_60: { count: number; capital: number }
  days_61_to_90: { count: number; capital: number }
  over_90_days: { count: number; capital: number }
  high_risk_capital: number // >60 days capital
}

// ─── COMPETITOR MONITORING ───────────────────────────────────────────────────

export type CompetitorSourceStatus = 'active' | 'source_required' | 'unavailable'

export interface Competitor {
  id: string
  dealership_id: string
  name: string
  website?: string | null
  location?: string | null
  distance_miles?: number | null
  source_status: CompetitorSourceStatus
  source_provider?: string | null
  notes?: string | null
  is_active: boolean
  stock_count?: number
  created_at: string
}

export interface CompetitorPriceChange {
  competitor_id: string
  competitor_name: string
  make: string
  model: string
  derivative?: string | null
  year?: number | null
  old_price: number
  new_price: number
  price_change: number
  observed_at: string
}

export interface CompetitorActivityItem {
  id: string
  competitor_name: string
  type: 'price_reduction' | 'price_increase' | 'new_stock' | 'no_longer_observed'
  title: string
  description: string
  observed_at: string
  price?: number
  old_price?: number
}

// ─── DEALERSHIP INTELLIGENCE SETTINGS ────────────────────────────────────────

export interface IntelligenceSettings {
  dealership_id: string
  target_gross_amount: number
  minimum_gross_amount: number
  target_gross_pct: number
  max_stock_age_days: number
  urgent_stock_age_days: number
  default_geo_radius_miles: number
  preferred_makes: string[]
  excluded_makes: string[]
  auto_price_approval_max_reduction: number
  updated_at: string
}
