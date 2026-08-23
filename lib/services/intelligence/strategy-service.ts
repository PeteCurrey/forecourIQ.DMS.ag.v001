import { createClient } from '@/lib/supabase/server'
import { IntelligenceSettings } from '@/lib/types/intelligence'
import { AuditService } from '@/lib/services/audit'

export const DEFAULT_INTELLIGENCE_SETTINGS: Omit<IntelligenceSettings, 'dealership_id' | 'updated_at'> = {
  target_gross_amount: 3000.0,
  minimum_gross_amount: 1500.0,
  target_gross_pct: 12.0,
  max_stock_age_days: 60,
  urgent_stock_age_days: 90,
  default_geo_radius_miles: 50,
  preferred_makes: ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Land Rover', 'Porsche'],
  excluded_makes: [],
  auto_price_approval_max_reduction: 500.0,
}

export class StrategyService {
  /**
   * Get or initialize dealership intelligence settings.
   */
  static async getSettings(dealershipId: string): Promise<IntelligenceSettings> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('dealership_intelligence_settings')
      .select('*')
      .eq('dealership_id', dealershipId)
      .single()

    if (error || !data) {
      // Upsert default settings
      const newSettings: IntelligenceSettings = {
        dealership_id: dealershipId,
        ...DEFAULT_INTELLIGENCE_SETTINGS,
        updated_at: new Date().toISOString(),
      }

      await supabase
        .from('dealership_intelligence_settings')
        .upsert(newSettings, { onConflict: 'dealership_id' })

      return newSettings
    }

    return {
      dealership_id: data.dealership_id,
      target_gross_amount: Number(data.target_gross_amount ?? DEFAULT_INTELLIGENCE_SETTINGS.target_gross_amount),
      minimum_gross_amount: Number(data.minimum_gross_amount ?? DEFAULT_INTELLIGENCE_SETTINGS.minimum_gross_amount),
      target_gross_pct: Number(data.target_gross_pct ?? DEFAULT_INTELLIGENCE_SETTINGS.target_gross_pct),
      max_stock_age_days: Number(data.max_stock_age_days ?? DEFAULT_INTELLIGENCE_SETTINGS.max_stock_age_days),
      urgent_stock_age_days: Number(data.urgent_stock_age_days ?? DEFAULT_INTELLIGENCE_SETTINGS.urgent_stock_age_days),
      default_geo_radius_miles: Number(data.default_geo_radius_miles ?? DEFAULT_INTELLIGENCE_SETTINGS.default_geo_radius_miles),
      preferred_makes: data.preferred_makes || DEFAULT_INTELLIGENCE_SETTINGS.preferred_makes,
      excluded_makes: data.excluded_makes || [],
      auto_price_approval_max_reduction: Number(data.auto_price_approval_max_reduction ?? DEFAULT_INTELLIGENCE_SETTINGS.auto_price_approval_max_reduction),
      updated_at: data.updated_at,
    }
  }

  /**
   * Update dealership intelligence settings.
   */
  static async updateSettings(
    dealershipId: string,
    userId: string,
    updates: Partial<IntelligenceSettings>
  ): Promise<IntelligenceSettings> {
    const supabase = await createClient()

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('dealership_intelligence_settings')
      .update(payload)
      .eq('dealership_id', dealershipId)
      .select('*')
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'intelligence.settings_changed',
      entity_type: 'dealership_intelligence_settings',
      entity_id: dealershipId,
      metadata: { updates },
    })

    return this.getSettings(dealershipId)
  }
}
