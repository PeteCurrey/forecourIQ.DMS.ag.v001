import { createClient } from '@/lib/supabase/server';
import { DealershipUnitEconomics } from '@/lib/types/platform';
import crypto from 'crypto';

export class TelemetryService {
  /**
   * Generate or extract correlation request ID.
   */
  static generateRequestId(): string {
    return `req_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Record operational usage metric event (idempotently increments daily record).
   */
  static async recordUsageEvent(
    dealershipId: string,
    event: {
      type: 'ai_call' | 'dvla_lookup' | 'cap_valuation' | 'sms' | 'email' | 'storage';
      tokens?: number;
      aiCostGbp?: number;
      bytes?: number;
    }
  ): Promise<void> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Ensure daily record exists
    const { data: existing } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('date', today)
      .maybeSingle();

    if (!existing) {
      await supabase.from('usage_metrics').insert({
        dealership_id: dealershipId,
        date: today,
        ai_requests: event.type === 'ai_call' ? 1 : 0,
        ai_tokens: event.tokens || 0,
        ai_cost_gbp: event.aiCostGbp || 0,
        dvla_lookups: event.type === 'dvla_lookup' ? 1 : 0,
        cap_valuations: event.type === 'cap_valuation' ? 1 : 0,
        sms_sent: event.type === 'sms' ? 1 : 0,
        emails_sent: event.type === 'email' ? 1 : 0,
        storage_bytes_used: event.bytes || 0,
      });
      return;
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (event.type === 'ai_call') {
      updates.ai_requests = (existing.ai_requests || 0) + 1;
      updates.ai_tokens = (existing.ai_tokens || 0) + (event.tokens || 0);
      updates.ai_cost_gbp = (existing.ai_cost_gbp || 0) + (event.aiCostGbp || 0);
    } else if (event.type === 'dvla_lookup') {
      updates.dvla_lookups = (existing.dvla_lookups || 0) + 1;
    } else if (event.type === 'cap_valuation') {
      updates.cap_valuations = (existing.cap_valuations || 0) + 1;
    } else if (event.type === 'sms') {
      updates.sms_sent = (existing.sms_sent || 0) + 1;
    } else if (event.type === 'email') {
      updates.emails_sent = (existing.emails_sent || 0) + 1;
    } else if (event.type === 'storage') {
      updates.storage_bytes_used = event.bytes || existing.storage_bytes_used;
    }

    await supabase
      .from('usage_metrics')
      .update(updates)
      .eq('id', existing.id);
  }

  /**
   * Calculate unit economics & contribution margin for a dealership over the current month.
   */
  static async calculateUnitEconomics(dealershipId: string): Promise<DealershipUnitEconomics> {
    const supabase = await createClient();

    const [
      { data: dealership },
      { data: subscription },
      { data: usageRows }
    ] = await Promise.all([
      supabase.from('dealerships').select('name').eq('id', dealershipId).single(),
      supabase.from('subscriptions').select('plan_id, status').eq('dealership_id', dealershipId).maybeSingle(),
      supabase.from('usage_metrics').select('*').eq('dealership_id', dealershipId)
    ]);

    const planPrices: Record<string, number> = { starter: 149, professional: 299, elite: 499 };
    const subscriptionRevenueGbp = subscription ? (planPrices[subscription.plan_id] || 299) : 299;

    let aiCostGbp = 0;
    let dvlaCount = 0;
    let capCount = 0;
    let smsCount = 0;
    let emailCount = 0;
    let storageBytes = 0;

    (usageRows || []).forEach(row => {
      aiCostGbp += Number(row.ai_cost_gbp || 0);
      dvlaCount += Number(row.dvla_lookups || 0);
      capCount += Number(row.cap_valuations || 0);
      smsCount += Number(row.sms_sent || 0);
      emailCount += Number(row.emails_sent || 0);
      storageBytes = Math.max(storageBytes, Number(row.storage_bytes_used || 0));
    });

    // Approximate unit cost rates (benchmark SaaS economics)
    const vehicleDataCostGbp = (dvlaCount * 0.05) + (capCount * 0.25);
    const messagingCostGbp = (smsCount * 0.035) + (emailCount * 0.001);
    const storageCostGbp = (storageBytes / (1024 * 1024 * 1024)) * 0.02; // £0.02 per GB

    const totalVariableCostGbp = aiCostGbp + vehicleDataCostGbp + messagingCostGbp + storageCostGbp;
    const estimatedContributionMarginGbp = subscriptionRevenueGbp - totalVariableCostGbp;
    const marginPercentage = subscriptionRevenueGbp > 0 
      ? Math.round((estimatedContributionMarginGbp / subscriptionRevenueGbp) * 100)
      : 0;

    return {
      dealershipId,
      dealershipName: dealership?.name || 'Dealership',
      subscriptionRevenueGbp,
      aiCostGbp: parseFloat(aiCostGbp.toFixed(2)),
      messagingCostGbp: parseFloat(messagingCostGbp.toFixed(2)),
      vehicleDataCostGbp: parseFloat(vehicleDataCostGbp.toFixed(2)),
      storageCostGbp: parseFloat(storageCostGbp.toFixed(2)),
      totalVariableCostGbp: parseFloat(totalVariableCostGbp.toFixed(2)),
      estimatedContributionMarginGbp: parseFloat(estimatedContributionMarginGbp.toFixed(2)),
      marginPercentage,
    };
  }
}
