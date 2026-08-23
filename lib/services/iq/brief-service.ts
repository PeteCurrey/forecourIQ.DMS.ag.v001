import { createClient } from '@/lib/supabase/server';
import { AuditService } from '@/lib/services/audit';
import { ContextEngine } from './context-engine';
import { IQProvider } from './provider';
import { DailyBriefing, BriefingStructuredPayload, BriefingType } from '@/lib/types/iq';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';

export const BriefService = {
  /**
   * Generates or updates the daily/weekly briefing.
   * Deterministic structured facts are assembled first, followed by AI synthesis.
   */
  async generateBriefing(dealershipId: string, briefingType: BriefingType = 'daily', userId?: string): Promise<DailyBriefing> {
    const supabase = await createClient();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 1. Assemble Deterministic Fact Pack
    const factPack = await ContextEngine.getBriefingFactPack(dealershipId);

    const structured: BriefingStructuredPayload = {
      yesterday: {
        units_sold: factPack.sales.yesterday_sold,
        gross_profit: factPack.sales.yesterday_gross,
        new_leads: factPack.sales.leads_last_24h,
        appointments_completed: 0,
      },
      today: {
        test_drives: factPack.agenda.today_appointments,
        handovers: factPack.agenda.today_handovers,
        followups_due: factPack.sales.unanswered_leads_48h,
        prep_due: factPack.agenda.today_prep_deadlines,
      },
      needs_attention: {
        unanswered_leads: factPack.sales.unanswered_leads_48h,
        compliance_blockers: factPack.compliance.blocked_deals,
        stale_stock_capital: factPack.stock.over_60_days > 0 ? (factPack.stock.total_invested * 0.4) : 0,
        failed_feed_updates: factPack.integrations.feed_errors,
        items: [
          factPack.sales.unanswered_leads_48h > 0 ? `${factPack.sales.unanswered_leads_48h} customer leads awaiting response over 48 hours` : '',
          factPack.compliance.blocked_deals > 0 ? `${factPack.compliance.blocked_deals} deals blocked by compliance requirements` : '',
          factPack.stock.over_60_days > 0 ? `${factPack.stock.over_60_days} vehicles on forecourt for more than 60 days` : '',
        ].filter(Boolean),
      },
      intelligence: {
        buying_opportunities: factPack.intelligence.active_buying_signals,
        pricing_reviews: factPack.intelligence.active_pricing_signals,
        stock_gaps: factPack.intelligence.active_buying_signals,
        summary: `${factPack.intelligence.active_buying_signals} acquisition opportunities detected and ${factPack.intelligence.active_pricing_signals} vehicles flagged for pricing attention.`,
      },
      systems: {
        status: factPack.integrations.feed_errors > 0 ? 'attention_required' : 'healthy',
        issues: factPack.integrations.feed_errors > 0 ? [`${factPack.integrations.feed_errors} portal feed updates failed`] : [],
      }
    };

    // 2. Request AI Narrative Synthesis
    const prompt = `You are ForecourIQ operating briefing engine. Synthesize a concise 3-paragraph executive operational brief for the Dealer Principal using these exact facts:
- Stock: ${factPack.stock.total_retail} units on plot (£${factPack.stock.total_invested.toLocaleString()} invested, ${factPack.stock.over_60_days} units >60d)
- Today Agenda: ${structured.today.test_drives} appointments/test drives, ${structured.today.handovers} handovers, ${structured.today.prep_due} prep deadlines
- Attention items: ${structured.needs_attention.items.join('; ') || 'None'}
- Intelligence: ${structured.intelligence.summary}

Provide a calm, professional briefing summarizing what matters today, priority blockers, and commercial opportunities. No fluff, no exclamation marks.`;

    const aiRes = await IQProvider.complete({
      dealershipId,
      userId,
      capability: 'reasoning',
      systemPrompt: 'You are ForecourIQ, a high-end automotive operational briefing intelligence. Be direct, factual, and concise.',
      userPrompt: prompt,
      maxTokens: 500,
    });

    // 3. Fallback deterministic summary if AI narrative empty
    const narrativeSummary = aiRes.content || `Good morning. You currently have ${factPack.stock.total_retail} retail units on plot with an average stock age of ${factPack.stock.average_days} days. Today's agenda includes ${structured.today.test_drives} scheduled appointments and ${structured.today.prep_due} preparation deadlines. ${structured.needs_attention.items.length > 0 ? `Attention is required on ${structured.needs_attention.items.join(', ')}.` : 'All operational SLAs are currently in good order.'}`;

    // 4. Upsert briefing record
    const { data: briefing, error } = await supabase
      .from('daily_briefings')
      .upsert({
        dealership_id: dealershipId,
        briefing_date: todayStr,
        briefing_type: briefingType,
        summary: narrativeSummary,
        structured_payload: structured,
        model_provider: aiRes.modelProvider,
        model_name: aiRes.modelName,
        input_snapshot: factPack,
        status: 'published',
        created_by: userId || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'dealership_id,briefing_date,briefing_type' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save briefing: ${error.message}`);
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'iq.brief_generated',
      entity_type: 'daily_briefing',
      entity_id: briefing.id,
      metadata: { briefing_type: briefingType, date: todayStr },
    });

    return briefing as DailyBriefing;
  },

  /**
   * Retrieves today's active briefing, generating on-the-fly if not already present.
   */
  async getTodayBriefing(dealershipId: string, briefingType: BriefingType = 'daily'): Promise<DailyBriefing> {
    const supabase = await createClient();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('daily_briefings')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('briefing_date', todayStr)
      .eq('briefing_type', briefingType)
      .maybeSingle();

    if (data) return data as DailyBriefing;

    return this.generateBriefing(dealershipId, briefingType);
  },

  /**
   * Retrieves historical briefings for management review.
   */
  async getHistory(dealershipId: string, limit = 14): Promise<DailyBriefing[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('daily_briefings')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('briefing_date', { ascending: false })
      .limit(limit);

    return (data || []) as DailyBriefing[];
  }
};
