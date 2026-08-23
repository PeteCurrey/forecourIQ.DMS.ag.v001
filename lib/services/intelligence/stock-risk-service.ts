import { createClient } from '@/lib/supabase/server'
import { StockRiskSignal, CapitalExposureSummary } from '@/lib/types/intelligence'

export class StockRiskService {
  /**
   * Calculates capital exposure breakdown across forecourt age bands.
   */
  static async getCapitalExposureSummary(dealershipId: string): Promise<CapitalExposureSummary> {
    const supabase = await createClient()

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, purchase_price, prep_cost, transport_cost, created_at, status')
      .eq('dealership_id', dealershipId)
      .in('status', ['available', 'advertised', 'preparation', 'reserved'])

    const stock = vehicles || []
    const now = Date.now()

    let totalCapital = 0
    let under30Count = 0
    let under30Cap = 0
    let d31to60Count = 0
    let d31to60Cap = 0
    let d61to90Count = 0
    let d61to90Cap = 0
    let over90Count = 0
    let over90Cap = 0

    for (const v of stock) {
      const cost =
        Number(v.purchase_price || 0) +
        Number(v.prep_cost || 0) +
        Number(v.transport_cost || 0)

      totalCapital += cost

      const createdAt = new Date(v.created_at).getTime()
      const days = Math.max(1, Math.round((now - createdAt) / (1000 * 60 * 60 * 24)))

      if (days <= 30) {
        under30Count++
        under30Cap += cost
      } else if (days <= 60) {
        d31to60Count++
        d31to60Cap += cost
      } else if (days <= 90) {
        d61to90Count++
        d61to90Cap += cost
      } else {
        over90Count++
        over90Cap += cost
      }
    }

    return {
      total_capital_invested: totalCapital,
      under_30_days: { count: under30Count, capital: under30Cap },
      days_31_to_60: { count: d31to60Count, capital: d31to60Cap },
      days_61_to_90: { count: d61to90Count, capital: d61to90Cap },
      over_90_days: { count: over90Count, capital: over90Cap },
      high_risk_capital: d61to90Cap + over90Cap,
    }
  }

  /**
   * Generates stock risk signals for individual vehicles.
   */
  static async getStockRiskSignals(dealershipId: string): Promise<StockRiskSignal[]> {
    const supabase = await createClient()

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration, make, model, year, asking_price, purchase_price, prep_cost, transport_cost, created_at, status')
      .eq('dealership_id', dealershipId)
      .in('status', ['available', 'advertised', 'preparation', 'reserved'])

    if (!vehicles || vehicles.length === 0) {
      return []
    }

    const now = Date.now()
    const riskSignals: StockRiskSignal[] = []

    for (const v of vehicles) {
      const createdAt = new Date(v.created_at).getTime()
      const days = Math.max(1, Math.round((now - createdAt) / (1000 * 60 * 60 * 24)))
      const cost =
        Number(v.purchase_price || 0) +
        Number(v.prep_cost || 0) +
        Number(v.transport_cost || 0)
      const askingPrice = Number(v.asking_price || 0)
      const margin = askingPrice - cost

      // Flag vehicles over 45 days or with high capital exposure
      if (days >= 45 || cost >= 35000) {
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
        if (days >= 90 || (days >= 60 && cost >= 30000)) severity = 'critical'
        else if (days >= 60 || cost >= 40000) severity = 'high'

        const reasons: string[] = []
        if (days >= 60) reasons.push(`${days} days on plot exceeds dealership threshold.`)
        if (cost >= 30000) reasons.push(`High capital exposure (£${cost.toLocaleString()}).`)
        if (margin < 1500) reasons.push(`Compressed margin buffer (£${margin.toLocaleString()}).`)

        riskSignals.push({
          id: `risk_${v.id}`,
          dealership_id: dealershipId,
          vehicle_id: v.id,
          vehicle_summary: {
            registration: v.registration,
            make: v.make,
            model: v.model,
            year: v.year,
            asking_price: askingPrice,
          },
          risk_type: days >= 60 ? 'ageing_capital' : 'high_exposure',
          capital_invested: cost,
          days_in_stock: days,
          projected_gross_loss: days >= 60 ? 500 : 0,
          severity,
          reasons,
          created_at: new Date().toISOString(),
        })
      }
    }

    return riskSignals.sort((a, b) => b.days_in_stock - a.days_in_stock)
  }
}
