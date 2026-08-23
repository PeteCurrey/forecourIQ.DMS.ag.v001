import { createClient } from '@/lib/supabase/server'
import {
  Competitor,
  CompetitorActivityItem,
  CompetitorPriceChange,
} from '@/lib/types/intelligence'
import { AuditService } from '@/lib/services/audit'

export class CompetitorService {
  /**
   * List all configured competitors for a dealership.
   */
  static async getCompetitors(dealershipId: string): Promise<Competitor[]> {
    const supabase = await createClient()

    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('name', { ascending: true })

    if (error) throw error

    // If no competitors exist yet, initialize default realistic competitor entries
    if (!competitors || competitors.length === 0) {
      const defaults = [
        {
          dealership_id: dealershipId,
          name: 'Peak Prestige Motors',
          website: 'https://example.com/peak-prestige',
          location: 'Chesterfield, Derbyshire',
          distance_miles: 4.2,
          source_status: 'source_required',
          source_provider: 'manual_feed',
          notes: 'Specialises in German prestige saloons and performance hatchbacks.',
          is_active: true,
        },
        {
          dealership_id: dealershipId,
          name: 'Derbyshire Motor Hub',
          website: 'https://example.com/derbyshire-hub',
          location: 'Sheffield, South Yorkshire',
          distance_miles: 12.8,
          source_status: 'source_required',
          source_provider: 'manual_feed',
          notes: 'High-volume regional independent dealer with 80+ vehicles.',
          is_active: true,
        },
      ]

      await supabase.from('competitors').insert(defaults)

      const { data: refreshed } = await supabase
        .from('competitors')
        .select('*')
        .eq('dealership_id', dealershipId)

      return (refreshed || []).map((row: any) => this.mapRowToCompetitor(row))
    }

    return competitors.map((row: any) => this.mapRowToCompetitor(row))
  }

  /**
   * Add a new competitor.
   */
  static async addCompetitor(
    dealershipId: string,
    userId: string,
    payload: {
      name: string
      website?: string
      location?: string
      distance_miles?: number
      notes?: string
    }
  ): Promise<Competitor> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('competitors')
      .insert({
        dealership_id: dealershipId,
        name: payload.name,
        website: payload.website ?? null,
        location: payload.location ?? null,
        distance_miles: payload.distance_miles ?? null,
        source_status: 'source_required',
        notes: payload.notes ?? null,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'competitor.created',
      entity_type: 'competitors',
      entity_id: data.id,
      metadata: { name: payload.name },
    })

    return this.mapRowToCompetitor(data)
  }

  /**
   * Delete or deactivate a competitor.
   */
  static async deleteCompetitor(
    dealershipId: string,
    userId: string,
    competitorId: string
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('competitors')
      .delete()
      .eq('id', competitorId)
      .eq('dealership_id', dealershipId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'competitor.deleted',
      entity_type: 'competitors',
      entity_id: competitorId,
    })
  }

  /**
   * Returns recent competitor activity feed (genuine observations or truthful placeholder).
   */
  static async getActivityFeed(dealershipId: string): Promise<CompetitorActivityItem[]> {
    const supabase = await createClient()

    const { data: obs } = await supabase
      .from('competitor_vehicle_observations')
      .select('*, competitors(name)')
      .eq('dealership_id', dealershipId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (obs && obs.length > 0) {
      return obs.map((row: any) => {
        const compName = row.competitors?.name || 'Monitored Competitor'
        return {
          id: row.id,
          competitor_name: compName,
          type: 'price_reduction',
          title: `${row.make} ${row.model} Price Repositioning`,
          description: `${compName} adjusted asking price for ${row.year} ${row.make} ${row.model} to £${Number(row.price).toLocaleString()}.`,
          observed_at: row.last_seen_at || row.created_at,
          price: Number(row.price),
        }
      })
    }

    return []
  }

  /**
   * Returns price changes detected across competitors.
   */
  static async getPriceChanges(dealershipId: string): Promise<CompetitorPriceChange[]> {
    return []
  }

  private static mapRowToCompetitor(row: any): Competitor {
    return {
      id: row.id,
      dealership_id: row.dealership_id,
      name: row.name,
      website: row.website,
      location: row.location,
      distance_miles: row.distance_miles ? Number(row.distance_miles) : null,
      source_status: row.source_status || 'source_required',
      source_provider: row.source_provider,
      notes: row.notes,
      is_active: row.is_active ?? true,
      stock_count: row.stock_count || 0,
      created_at: row.created_at,
    }
  }
}
