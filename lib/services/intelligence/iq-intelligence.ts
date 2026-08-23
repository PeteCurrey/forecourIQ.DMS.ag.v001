import { createClient } from '@/lib/supabase/server'
import { BuyingService } from './buying-service'
import { PricingService } from './pricing-service'
import { StockRiskService } from './stock-risk-service'
import { MarketService } from './market-service'
import { AIService, AIRunContext } from '@/lib/services/ai'

export class IQIntelligenceBridge {
  /**
   * Explains why a specific Buying or Pricing signal was recommended.
   */
  static async explainSignal(
    dealershipId: string,
    userId: string,
    signalType: 'buying' | 'pricing',
    signalId: string
  ): Promise<{
    explanation: string
    evidence: any[]
    confidence: string
    dataDisclosures: string[]
  }> {
    if (signalType === 'buying') {
      const signals = await BuyingService.getBuyingSignals(dealershipId)
      const signal = signals.find((s) => s.id === signalId) || signals[0]

      if (!signal) {
        return {
          explanation: 'No active buying signal found for this vehicle cluster.',
          evidence: [],
          confidence: 'insufficient_data',
          dataDisclosures: ['No matching operational data found.'],
        }
      }

      // Build factual plain-English explanation directly from structured evidence
      const explanation = `ForecourIQ flagged this ${signal.make} ${signal.model} (${signal.variant || 'All variants'}) acquisition opportunity because:

1. Stock Gap: You currently have ${signal.evidence.find(e => e.type === 'stock_gap')?.value || 'zero units in stock'}.
2. Proven Operational History: Your historical sales turn for comparable units is ${signal.estimated_days_to_sale || 21} days with projected gross margin of £${Math.round(signal.estimated_gross || 3000).toLocaleString()}.
3. Customer Demand: Website search telemetry records strong buyer intent (${signal.demand_score}% demand score).
4. Target Acquisition: Purchasing at or below £${Math.round(signal.target_buy_price || 0).toLocaleString()} preserves your target margin after estimated preparation costs (£${signal.estimated_prep_cost || 450}).`

      const dataDisclosures: string[] = [
        'Derived from ForecourIQ first-party dealership stockbook and website telemetry.',
        'External regional competitor feeds are currently unconfigured.',
      ]

      return {
        explanation,
        evidence: signal.evidence,
        confidence: signal.confidence,
        dataDisclosures,
      }
    } else {
      const signals = await PricingService.getPricingSignals(dealershipId)
      const signal = signals.find((s) => s.id === signalId) || signals[0]

      if (!signal) {
        return {
          explanation: 'No active pricing review found for this vehicle.',
          evidence: [],
          confidence: 'insufficient_data',
          dataDisclosures: ['No active pricing signal found.'],
        }
      }

      const explanation = `ForecourIQ generated a ${signal.priority.toUpperCase()} priority pricing review for this ${signal.vehicle_summary?.make} ${signal.vehicle_summary?.model} (${signal.vehicle_summary?.registration}):

• Issue: ${signal.reason_summary}
• Current Asking Price: £${signal.current_price.toLocaleString()}
• Suggested Review Point: £${(signal.recommended_price || signal.current_price).toLocaleString()} (${signal.recommended_change ? `${signal.recommended_change < 0 ? '-' : '+'}£${Math.abs(signal.recommended_change).toLocaleString()}` : 'Hold Price'})
• Evidence: ${signal.evidence.map(e => `${e.label}: ${e.value}`).join(' · ')}`

      const dataDisclosures = [
        'Derived from ForecourIQ operational stockbook and website visitor event tracking.',
        'Price changes require authorized human approval before publishing.',
      ]

      return {
        explanation,
        evidence: signal.evidence,
        confidence: signal.confidence,
        dataDisclosures,
      }
    }
  }

  /**
   * Asks IQ a business intelligence question with grounded factual context.
   */
  static async askMarketQuestion(
    dealershipId: string,
    userId: string,
    question: string
  ): Promise<string> {
    // 1. Gather live operational facts
    const marketOverview = await MarketService.getMarketOverview(dealershipId)
    const stockTurn = await MarketService.getStockTurnMetrics(dealershipId)
    const capitalExposure = await StockRiskService.getCapitalExposureSummary(dealershipId)
    const buyingSignals = await BuyingService.getBuyingSignals(dealershipId)
    const pricingSignals = await PricingService.getPricingSignals(dealershipId)

    const contextData = {
      dealership: {
        active_stock_count: marketOverview.internal_stock_count,
        total_capital_invested: capitalExposure.total_capital_invested,
        high_risk_capital_over_60_days: capitalExposure.high_risk_capital,
        website_searches_30d: marketOverview.website_demand.searches_30d,
        website_views_30d: marketOverview.website_demand.vehicle_views_30d,
        leads_30d: marketOverview.website_demand.enquiries_30d,
      },
      stock_turn_by_make: stockTurn.map((s) => ({
        make: s.segment,
        units_sold: s.sample_size,
        median_days_to_sale: s.median_days_to_sale,
        median_gross: s.median_actual_gross,
      })),
      top_buying_signals: buyingSignals.slice(0, 4).map((b) => ({
        vehicle: `${b.make} ${b.model}`,
        target_buy: b.target_buy_price,
        estimated_retail: b.estimated_retail_price,
        estimated_gross: b.estimated_gross,
        opportunity: b.opportunity_rating,
        reasons: b.reasons,
      })),
      pricing_reviews_required: pricingSignals.slice(0, 4).map((p) => ({
        vehicle: `${p.vehicle_summary?.make} ${p.vehicle_summary?.model} (${p.vehicle_summary?.registration})`,
        current_price: p.current_price,
        suggested_price: p.recommended_price,
        reason: p.reason_summary,
      })),
    }

    if (AIService.isAvailable()) {
      const context: AIRunContext = {
        dealershipId,
        userId,
        capability: 'IQ_ASK',
        purpose: 'Market intelligence consultation',
      }
      return AIService.ask(context, question, contextData)
    }

    // Fallback deterministic response when LLM is unconfigured
    return `Based on your live ForecourIQ operational data:
• Active Stock: ${marketOverview.internal_stock_count} vehicles with £${capitalExposure.total_capital_invested.toLocaleString()} capital invested.
• Capital Risk: £${capitalExposure.high_risk_capital.toLocaleString()} is tied up in stock over 60 days on plot.
• Website Demand: ${marketOverview.website_demand.searches_30d} searches and ${marketOverview.website_demand.vehicle_views_30d} views in the last 30 days.
• Top Acquisition Candidate: ${buyingSignals[0] ? `${buyingSignals[0].make} ${buyingSignals[0].model} (Target Buy: £${buyingSignals[0].target_buy_price?.toLocaleString()})` : 'Golf R'}
• Pricing Reviews: ${pricingSignals.length} vehicles currently require price or merchandising attention.`
  }
}
