import { createClient } from '@/lib/supabase/server';
import { 
  AnalyticsEventName, 
  AnalyticsCategory, 
  ActivationMilestone, 
  ActivationSummary 
} from '@/lib/types/analytics';

export class ProductAnalyticsService {
  /**
   * Track a privacy-conscious operational product telemetry event.
   */
  static async trackEvent(
    dealershipId: string,
    eventName: AnalyticsEventName,
    category: AnalyticsCategory,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('product_analytics_events').insert({
        dealership_id: dealershipId,
        user_id: userId || null,
        event_name: eventName,
        event_category: category,
        properties,
      });
    } catch (err) {
      // Non-blocking telemetry
      console.warn('Analytics event tracking failed:', err);
    }
  }

  /**
   * Record a dealership activation milestone (e.g. first vehicle added, first deal completed).
   * Idempotent: once recorded, existing milestone timestamp is preserved.
   */
  static async recordMilestone(
    dealershipId: string,
    milestone: ActivationMilestone,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const supabase = await createClient();

      // Check if milestone already recorded
      const { data: existing } = await supabase
        .from('dealership_activation_milestones')
        .select('id')
        .eq('dealership_id', dealershipId)
        .eq('milestone', milestone)
        .maybeSingle();

      if (existing) return false; // Already achieved

      // Fetch dealership created_at to calculate elapsed seconds
      const { data: dealer } = await supabase
        .from('dealerships')
        .select('created_at')
        .eq('id', dealershipId)
        .single();

      let elapsedSeconds: number | undefined;
      if (dealer?.created_at) {
        const signupTime = new Date(dealer.created_at).getTime();
        elapsedSeconds = Math.max(0, Math.floor((Date.now() - signupTime) / 1000));
      }

      const { error } = await supabase
        .from('dealership_activation_milestones')
        .insert({
          dealership_id: dealershipId,
          milestone,
          elapsed_seconds_from_signup: elapsedSeconds,
          metadata,
        });

      return !error;
    } catch (err) {
      console.warn('Failed to record milestone:', err);
      return false;
    }
  }

  /**
   * Get activation milestone summary and time-to-value metrics for a dealership.
   */
  static async getActivationSummary(dealershipId: string): Promise<ActivationSummary | null> {
    const supabase = await createClient();

    const { data: dealer } = await supabase
      .from('dealerships')
      .select('id, created_at')
      .eq('id', dealershipId)
      .single();

    if (!dealer) return null;

    const { data: rows } = await supabase
      .from('dealership_activation_milestones')
      .select('milestone, achieved_at, elapsed_seconds_from_signup')
      .eq('dealership_id', dealershipId);

    const milestoneMap: Record<string, { achievedAt: string; elapsedSeconds?: number }> = {};
    (rows || []).forEach(r => {
      milestoneMap[r.milestone] = {
        achievedAt: r.achieved_at,
        elapsedSeconds: r.elapsed_seconds_from_signup,
      };
    });

    const canonicalMilestones: ActivationMilestone[] = [
      'first_user_invited',
      'first_vehicle_added',
      'first_stock_import',
      'first_lead_received',
      'first_customer_reply',
      'first_deal_created',
      'first_sale_completed',
      'first_iq_used',
      'first_website_lead',
      'first_transfer_completed',
    ];

    const milestonesResult: any = {};
    canonicalMilestones.forEach(m => {
      const match = milestoneMap[m];
      milestonesResult[m] = {
        achieved: !!match,
        achievedAt: match?.achievedAt,
        elapsedHours: match?.elapsedSeconds ? Math.round((match.elapsedSeconds / 3600) * 10) / 10 : undefined,
      };
    });

    const getElapsedHours = (m: ActivationMilestone) => {
      const s = milestoneMap[m]?.elapsedSeconds;
      return s !== undefined ? Math.round((s / 3600) * 10) / 10 : undefined;
    };

    return {
      dealershipId,
      signupDate: dealer.created_at,
      milestones: milestonesResult,
      timeToFirstVehicleHours: getElapsedHours('first_vehicle_added'),
      timeToFirstLeadHours: getElapsedHours('first_lead_received'),
      timeToFirstDealHours: getElapsedHours('first_deal_created'),
      timeToFirstSaleHours: getElapsedHours('first_sale_completed'),
    };
  }

  /**
   * Aggregate workflow adoption across dealerships for Platform Console.
   */
  static async getWorkflowAdoptionReport(): Promise<{
    totalDealerships: number;
    crmAdoptionPct: number;
    dealDeskAdoptionPct: number;
    iqAdoptionPct: number;
    websiteAdoptionPct: number;
    transfersAdoptionPct: number;
    chatAdoptionPct: number;
  }> {
    const supabase = await createClient();

    const { count: totalDealerships } = await supabase
      .from('dealerships')
      .select('id', { count: 'exact', head: true })
      .not('lifecycle_status', 'in', '("archived","cancelled")');

    const total = totalDealerships || 1;

    // Count distinct dealerships utilizing major domains
    const [leadsRes, dealsRes, iqRes, webRes, transfersRes, chatRes] = await Promise.all([
      supabase.from('leads').select('dealership_id'),
      supabase.from('deals').select('dealership_id'),
      supabase.from('ai_recommendations').select('dealership_id'),
      supabase.from('dealer_websites').select('dealership_id'),
      supabase.from('stock_transfers').select('dealership_id'),
      supabase.from('internal_messages').select('dealership_id'),
    ]);

    const getUniqueDealerCount = (items: any[] | null) => new Set((items || []).map(i => i.dealership_id)).size;

    return {
      totalDealerships: total,
      crmAdoptionPct: Math.round((getUniqueDealerCount(leadsRes.data) / total) * 100),
      dealDeskAdoptionPct: Math.round((getUniqueDealerCount(dealsRes.data) / total) * 100),
      iqAdoptionPct: Math.round((getUniqueDealerCount(iqRes.data) / total) * 100),
      websiteAdoptionPct: Math.round((getUniqueDealerCount(webRes.data) / total) * 100),
      transfersAdoptionPct: Math.round((getUniqueDealerCount(transfersRes.data) / total) * 100),
      chatAdoptionPct: Math.round((getUniqueDealerCount(chatRes.data) / total) * 100),
    };
  }
}
