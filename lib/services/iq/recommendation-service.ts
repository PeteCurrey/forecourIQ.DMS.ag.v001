import { createClient } from '@/lib/supabase/server';
import { AuditService } from '@/lib/services/audit';
import { AIRecommendation, RecommendationPriority } from '@/lib/types/iq';
import { BuyingService } from '@/lib/services/intelligence/buying-service';
import { PricingService } from '@/lib/services/intelligence/pricing-service';
import { subDays, differenceInDays } from 'date-fns';

export const RecommendationService = {
  /**
   * Scans dealership records and generates deduplicated proactive recommendations.
   */
  async scanAndGenerate(dealershipId: string): Promise<AIRecommendation[]> {
    const supabase = await createClient();
    const now = new Date();
    const twoDaysAgo = subDays(now, 2);

    const [
      { data: overdueLeads },
      { data: vehicles },
      { data: blockedDeals },
      buyingSignals,
      pricingSignals,
    ] = await Promise.all([
      supabase.from('leads').select('id, first_name, last_name, created_at, vehicles(make, model, registration)').eq('dealership_id', dealershipId).in('status', ['new', 'contacted']).lt('created_at', twoDaysAgo.toISOString()).limit(5),
      supabase.from('vehicles').select('id, make, model, registration, asking_price, created_at, status').eq('dealership_id', dealershipId).eq('status', 'available'),
      supabase.from('deals').select('id, deal_reference, stage, status, vehicle_id, customer_id, vehicles(make, model, registration), customers(first_name, last_name)').eq('dealership_id', dealershipId).eq('status', 'blocked').limit(3),
      BuyingService.getBuyingSignals(dealershipId),
      PricingService.getPricingSignals(dealershipId),
    ]);

    const generated: Array<{
      category: AIRecommendation['category'];
      entity_type?: string;
      entity_id?: string;
      title: string;
      summary: string;
      priority: RecommendationPriority;
      confidence: AIRecommendation['confidence'];
      fingerprint: string;
      evidence: Array<{ label: string; value: string | number; link?: string }>;
      suggested_action?: any;
    }> = [];

    // 1. Overdue Lead Recommendations
    for (const lead of overdueLeads || []) {
      const days = differenceInDays(now, new Date(lead.created_at));
      const veh = Array.isArray(lead.vehicles) ? lead.vehicles[0] : lead.vehicles;
      const vehName = veh ? `${veh.make} ${veh.model}` : 'general inquiry';

      generated.push({
        category: 'sales',
        entity_type: 'lead',
        entity_id: lead.id,
        title: `Overdue lead: ${lead.first_name} ${lead.last_name}`,
        summary: `Customer enquired about ${vehName} ${days} days ago without follow-up recorded.`,
        priority: 'high',
        confidence: 'high',
        fingerprint: `sales:lead:${lead.id}`,
        evidence: [
          { label: 'Customer', value: `${lead.first_name} ${lead.last_name}` },
          { label: 'Enquiry Date', value: new Date(lead.created_at).toLocaleDateString('en-GB') },
          { label: 'Vehicle', value: vehName },
        ],
        suggested_action: {
          action_type: 'lead.create_followup',
          label: 'Create Follow-up Task',
          payload: { lead_id: lead.id, title: `Follow up with ${lead.first_name} ${lead.last_name}` },
        }
      });
    }

    // 2. Pricing Review Recommendations
    for (const sig of pricingSignals.filter(s => s.status === 'active').slice(0, 3)) {
      generated.push({
        category: 'pricing',
        entity_type: 'vehicle',
        entity_id: sig.vehicle_id,
        title: `Price Review: ${sig.vehicle_summary?.make} ${sig.vehicle_summary?.model}`,
        summary: `${sig.reason_summary} (Suggested: £${sig.recommended_price})`,
        priority: sig.priority as RecommendationPriority,
        confidence: (sig.confidence === 'high' ? 'high' : sig.confidence === 'medium' ? 'medium' : 'low'),
        fingerprint: `pricing:vehicle:${sig.vehicle_id}:${sig.signal_type}`,
        evidence: [
          { label: 'Current Asking Price', value: `£${sig.current_price}` },
          { label: 'Recommended Price', value: `£${sig.recommended_price}` },
          { label: 'Signal Type', value: sig.signal_type },
        ],
        suggested_action: {
          action_type: 'pricing.prepare_change',
          label: 'Propose Price Change',
          payload: { vehicle_id: sig.vehicle_id, recommended_price: sig.recommended_price, signal_type: sig.signal_type },
        }
      });
    }

    // 3. Buying Opportunity Recommendations
    for (const buy of buyingSignals.filter(s => s.status === 'new').slice(0, 3)) {
      generated.push({
        category: 'buying',
        entity_type: 'cluster',
        title: `Stock Gap: ${buy.make} ${buy.model} ${buy.variant || ''}`,
        summary: `High search demand detected on website with 0 units currently on plot. Target buy £${buy.target_buy_price || 0}.`,
        priority: 'high',
        confidence: 'high',
        fingerprint: `buying:cluster:${buy.make}:${buy.model}:${buy.variant || ''}`,
        evidence: [
          { label: 'Make / Model', value: `${buy.make} ${buy.model}` },
          { label: 'Demand Score', value: `${buy.demand_score}/100` },
          { label: 'Target Buy Price', value: `£${buy.target_buy_price || 0}` },
        ],
      });
    }

    // 4. Blocked Deal Recommendations
    for (const deal of blockedDeals || []) {
      const veh = Array.isArray(deal.vehicles) ? deal.vehicles[0] : deal.vehicles;
      const cust = Array.isArray(deal.customers) ? deal.customers[0] : deal.customers;

      generated.push({
        category: 'deal',
        entity_type: 'deal',
        entity_id: deal.id,
        title: `Blocked deal: ${deal.deal_reference}`,
        summary: `Deal for ${cust ? `${cust.first_name} ${cust.last_name}` : 'Customer'} (${veh ? `${veh.make} ${veh.model}` : 'Vehicle'}) is currently blocked.`,
        priority: 'critical',
        confidence: 'high',
        fingerprint: `deal:blocked:${deal.id}`,
        evidence: [
          { label: 'Deal Ref', value: deal.deal_reference },
          { label: 'Stage', value: deal.stage },
        ],
      });
    }

    // Persist with fingerprint deduplication (Do not insert duplicates if already open)
    const { data: existing } = await supabase
      .from('ai_recommendations')
      .select('fingerprint')
      .eq('dealership_id', dealershipId)
      .in('status', ['new', 'reviewed', 'action_pending']);

    const existingFps = new Set((existing || []).map(e => e.fingerprint));

    const toInsert = generated.filter(g => !existingFps.has(g.fingerprint));

    if (toInsert.length > 0) {
      await supabase.from('ai_recommendations').insert(
        toInsert.map(item => ({
          dealership_id: dealershipId,
          category: item.category,
          entity_type: item.entity_type || null,
          entity_id: item.entity_id || null,
          title: item.title,
          summary: item.summary,
          priority: item.priority,
          confidence: item.confidence,
          status: 'new',
          fingerprint: item.fingerprint,
          evidence: item.evidence,
          suggested_action: item.suggested_action || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      );
    }

    // Return all active recommendations
    const { data: active } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .in('status', ['new', 'reviewed', 'action_pending'])
      .order('created_at', { ascending: false });

    return (active || []) as AIRecommendation[];
  },

  /**
   * Accepts a recommendation and optionally creates a pending AI action.
   */
  async accept(dealershipId: string, userId: string, recommendationId: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    await supabase.from('ai_recommendations').update({
      status: 'accepted',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', recommendationId).eq('dealership_id', dealershipId);

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'iq.recommendation_accepted',
      entity_type: 'ai_recommendation',
      entity_id: recommendationId,
    });

    return { success: true };
  },

  /**
   * Dismisses a recommendation with a documented reason.
   */
  async dismiss(dealershipId: string, userId: string, recommendationId: string, reason?: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    await supabase.from('ai_recommendations').update({
      status: 'dismissed',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      dismissed_reason: reason || 'Dismissed by user',
    }).eq('id', recommendationId).eq('dealership_id', dealershipId);

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'iq.recommendation_dismissed',
      entity_type: 'ai_recommendation',
      entity_id: recommendationId,
      metadata: { reason },
    });

    return { success: true };
  }
};
