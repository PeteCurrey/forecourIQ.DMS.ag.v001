import { createClient } from '@/lib/supabase/server'
import {
  PricingSignal,
  PricingSignalType,
  IntelligenceEvidenceItem,
} from '@/lib/types/intelligence'
import { StrategyService } from './strategy-service'
import { VehicleService } from '@/lib/services/vehicle'
import { AuditService } from '@/lib/services/audit'

export class PricingService {
  /**
   * Evaluates active stockbook vehicles and produces deterministic pricing signals.
   */
  static async getPricingSignals(dealershipId: string): Promise<PricingSignal[]> {
    const supabase = await createClient()
    const settings = await StrategyService.getSettings(dealershipId)

    // 1. Check existing stored pricing signals
    const { data: storedSignals } = await supabase
      .from('pricing_signals')
      .select('*, vehicles(id, registration, make, model, variant, year, asking_price, purchase_price, prep_cost, transport_cost, created_at, vehicle_images(url, is_primary))')
      .eq('dealership_id', dealershipId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (storedSignals && storedSignals.length > 0) {
      return storedSignals.map((row: any) => this.mapRowToSignal(row))
    }

    // 2. Fetch all active stock vehicles with website analytics and lead counts
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration, make, model, variant, year, mileage, asking_price, purchase_price, prep_cost, transport_cost, created_at, status, vehicle_images(url, is_primary)')
      .eq('dealership_id', dealershipId)
      .in('status', ['available', 'advertised', 'preparation', 'reserved'])

    if (!vehicles || vehicles.length === 0) {
      return []
    }

    // 3. Fetch website views per vehicle
    const { data: viewEvents } = await supabase
      .from('website_events')
      .select('vehicle_id')
      .eq('dealership_id', dealershipId)
      .eq('event_type', 'vehicle_view')

    const viewCountMap: Record<string, number> = {}
    for (const ev of viewEvents || []) {
      if (ev.vehicle_id) {
        viewCountMap[ev.vehicle_id] = (viewCountMap[ev.vehicle_id] || 0) + 1
      }
    }

    // 4. Fetch lead count per vehicle
    const { data: leads } = await supabase
      .from('leads')
      .select('vehicle_id')
      .eq('dealership_id', dealershipId)

    const leadCountMap: Record<string, number> = {}
    for (const l of leads || []) {
      if (l.vehicle_id) {
        leadCountMap[l.vehicle_id] = (leadCountMap[l.vehicle_id] || 0) + 1
      }
    }

    // 5. Evaluate each vehicle
    const signals: PricingSignal[] = []
    const now = Date.now()

    for (const v of vehicles) {
      const createdAt = new Date(v.created_at).getTime()
      const daysInStock = Math.max(1, Math.round((now - createdAt) / (1000 * 60 * 60 * 24)))
      const askingPrice = Number(v.asking_price || 0)
      const totalCost = Number(v.purchase_price || 0) + Number(v.prep_cost || 0) + Number(v.transport_cost || 0)
      const projectedGross = askingPrice - totalCost
      const views = viewCountMap[v.id] || 0
      const leadCount = leadCountMap[v.id] || 0

      const primaryImg = v.vehicle_images?.find((img: any) => img.is_primary)?.url || v.vehicle_images?.[0]?.url || null

      // Rule A: High Views but Low Leads (e.g. >15 views, <=1 enquiry)
      if (views >= 15 && leadCount <= 1 && daysInStock > 10) {
        const recommendedReduction = 500
        const recommendedPrice = askingPrice - recommendedReduction

        const evidence: IntelligenceEvidenceItem[] = [
          {
            type: 'website_views',
            label: 'Website Views (30d)',
            value: `${views} visitor views`,
            source: 'ForecourIQ Website Telemetry',
            provenance: 'FIRST_PARTY',
          },
          {
            type: 'lead_enquiries',
            label: 'Enquiries Received',
            value: `${leadCount} enquiries`,
            source: 'ForecourIQ CRM Leads',
            provenance: 'FIRST_PARTY',
          },
          {
            type: 'conversion_gap',
            label: 'Conversion Deficit',
            value: `${((leadCount / views) * 100).toFixed(1)}% conversion (vs 4.5% baseline)`,
            source: 'Commercial Analytics Engine',
            provenance: 'DERIVED',
          },
        ]

        signals.push({
          id: `prc_views_${v.id}`,
          dealership_id: dealershipId,
          vehicle_id: v.id,
          vehicle_summary: {
            registration: v.registration,
            make: v.make,
            model: v.model,
            variant: v.variant,
            year: v.year,
            days_in_stock: daysInStock,
            primary_image_url: primaryImg,
          },
          current_price: askingPrice,
          recommended_price: recommendedPrice,
          recommended_change: -recommendedReduction,
          signal_type: 'high_views_low_leads',
          priority: 'high',
          confidence: 'high',
          comparable_count: 0,
          reason_summary: `High visitor engagement (${views} views) with only ${leadCount} enquiry indicates price resistance or specification mismatch.`,
          evidence,
          status: 'active',
          model_version: 'v1.0',
          created_at: new Date().toISOString(),
        })
      }

      // Rule B: Ageing Stock (>45 days on forecourt)
      else if (daysInStock >= (settings.max_stock_age_days || 45) && leadCount <= 2) {
        const isUrgent = daysInStock >= (settings.urgent_stock_age_days || 90)
        const recommendedReduction = isUrgent ? 1000 : 500
        const recommendedPrice = askingPrice - recommendedReduction

        const evidence: IntelligenceEvidenceItem[] = [
          {
            type: 'days_in_stock',
            label: 'Forecourt Age',
            value: `${daysInStock} days in stock`,
            source: 'ForecourIQ Stockbook',
            provenance: 'FIRST_PARTY',
          },
          {
            type: 'capital_exposure',
            label: 'Capital Invested',
            value: `£${totalCost.toLocaleString()}`,
            source: 'ForecourIQ Vehicle Accounts',
            provenance: 'FIRST_PARTY',
          },
          {
            type: 'margin_buffer',
            label: 'Current Gross Buffer',
            value: `£${projectedGross.toLocaleString()} projected gross`,
            source: 'Commercial Arithmetic Engine',
            provenance: 'DERIVED',
          },
        ]

        signals.push({
          id: `prc_age_${v.id}`,
          dealership_id: dealershipId,
          vehicle_id: v.id,
          vehicle_summary: {
            registration: v.registration,
            make: v.make,
            model: v.model,
            variant: v.variant,
            year: v.year,
            days_in_stock: daysInStock,
            primary_image_url: primaryImg,
          },
          current_price: askingPrice,
          recommended_price: recommendedPrice,
          recommended_change: -recommendedReduction,
          signal_type: 'ageing_stock',
          priority: isUrgent ? 'critical' : 'high',
          confidence: 'high',
          comparable_count: 0,
          reason_summary: `Vehicle has been in stock for ${daysInStock} days with £${totalCost.toLocaleString()} capital tied up. Price repositioning recommended to accelerate stock turn.`,
          evidence,
          status: 'active',
          model_version: 'v1.0',
          created_at: new Date().toISOString(),
        })
      }

      // Rule C: High Demand / Fast Interest -> Hold Price
      else if (leadCount >= 3 && daysInStock < 14) {
        const evidence: IntelligenceEvidenceItem[] = [
          {
            type: 'lead_velocity',
            label: 'Recent Leads',
            value: `${leadCount} active leads in ${daysInStock} days`,
            source: 'ForecourIQ CRM Leads',
            provenance: 'FIRST_PARTY',
          },
          {
            type: 'interest_level',
            label: 'Customer Demand',
            value: 'Strong initial pipeline',
            source: 'Deal Desk',
            provenance: 'FIRST_PARTY',
          },
        ]

        signals.push({
          id: `prc_hold_${v.id}`,
          dealership_id: dealershipId,
          vehicle_id: v.id,
          vehicle_summary: {
            registration: v.registration,
            make: v.make,
            model: v.model,
            variant: v.variant,
            year: v.year,
            days_in_stock: daysInStock,
            primary_image_url: primaryImg,
          },
          current_price: askingPrice,
          recommended_price: askingPrice,
          recommended_change: 0,
          signal_type: 'high_demand_hold',
          priority: 'low',
          confidence: 'high',
          comparable_count: 0,
          reason_summary: `Strong initial enquiry pace (${leadCount} leads in ${daysInStock} days). Hold current retail price of £${askingPrice.toLocaleString()}.`,
          evidence,
          status: 'active',
          model_version: 'v1.0',
          created_at: new Date().toISOString(),
        })
      }
    }

    return signals
  }

  /**
   * Applies human-approved price change recommendation.
   * Updates vehicle asking price, writes price history, queues advertising sync, and closes pricing signal.
   */
  static async applyPricingSignal(
    dealershipId: string,
    userId: string,
    signalId: string,
    newPrice: number
  ): Promise<void> {
    const supabase = await createClient()

    // 1. Fetch signal to get vehicle_id
    const { data: signal, error: sigErr } = await supabase
      .from('pricing_signals')
      .select('id, vehicle_id, current_price')
      .eq('id', signalId)
      .eq('dealership_id', dealershipId)
      .single()

    const vehicleId = signal?.vehicle_id || signalId.replace('prc_views_', '').replace('prc_age_', '').replace('prc_hold_', '')

    // 2. Update vehicle asking price using VehicleService
    await VehicleService.update(dealershipId, vehicleId, {
      asking_price: newPrice,
    }, userId)

    // 3. Mark signal as applied
    await supabase
      .from('pricing_signals')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signalId)
      .eq('dealership_id', dealershipId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'pricing_signal.applied',
      entity_type: 'pricing_signals',
      entity_id: signalId,
      metadata: { vehicleId, newPrice },
    })
  }

  /**
   * Dismiss pricing signal.
   */
  static async dismissPricingSignal(
    dealershipId: string,
    userId: string,
    signalId: string,
    dismissedReason?: string
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('pricing_signals')
      .update({
        status: 'dismissed',
        dismissed_reason: dismissedReason ?? 'Maintained current price on commercial discretion',
        dismissed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signalId)
      .eq('dealership_id', dealershipId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'pricing_signal.dismissed',
      entity_type: 'pricing_signals',
      entity_id: signalId,
      metadata: { dismissedReason },
    })
  }

  private static mapRowToSignal(row: any): PricingSignal {
    const v = row.vehicles || {}
    const primaryImg = v.vehicle_images?.find((img: any) => img.is_primary)?.url || v.vehicle_images?.[0]?.url || null
    const daysInStock = v.created_at
      ? Math.max(1, Math.round((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      : 30

    return {
      id: row.id,
      dealership_id: row.dealership_id,
      vehicle_id: row.vehicle_id,
      vehicle_summary: {
        registration: v.registration || '',
        make: v.make || '',
        model: v.model || '',
        variant: v.variant,
        year: v.year || 2021,
        days_in_stock: daysInStock,
        primary_image_url: primaryImg,
      },
      current_price: Number(row.current_price),
      recommended_price: row.recommended_price ? Number(row.recommended_price) : null,
      recommended_change: row.recommended_change ? Number(row.recommended_change) : null,
      signal_type: row.signal_type as PricingSignalType,
      priority: row.priority || 'medium',
      confidence: row.confidence || 'medium',
      market_position_pct: row.market_position_pct ? Number(row.market_position_pct) : null,
      comparable_count: Number(row.comparable_count || 0),
      reason_summary: row.reason_summary,
      evidence: row.evidence || [],
      status: row.status || 'active',
      applied_at: row.applied_at,
      applied_by: row.applied_by,
      dismissed_reason: row.dismissed_reason,
      model_version: row.model_version || 'v1.0',
      expires_at: row.expires_at,
      created_at: row.created_at,
    }
  }
}
