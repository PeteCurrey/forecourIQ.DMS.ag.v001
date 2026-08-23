import { createClient } from '@/lib/supabase/server';
import { AuditService } from '@/lib/services/audit';
import { ContextEngine } from './context-engine';
import { IQProvider } from './provider';
import { AskIQRequest, AskIQResponse } from '@/lib/types/iq';

export const AskService = {
  /**
   * Main conversational operational intelligence endpoint.
   * Grounded in factual dealership data with role-based redaction and prompt injection shielding.
   */
  async ask(dealershipId: string, userId: string, userRole: string, req: AskIQRequest): Promise<AskIQResponse> {
    const supabase = await createClient();

    // 1. Get role-filtered facts
    const facts = await ContextEngine.getDealershipFactPack(dealershipId, userRole);

    // 2. Fetch or create conversation
    let convId = req.conversation_id;
    if (!convId) {
      const { data: conv } = await supabase.from('ai_conversations').insert({
        dealership_id: dealershipId,
        user_id: userId,
        title: req.question.slice(0, 50),
        context_entity_type: req.context_entity?.type || null,
        context_entity_id: req.context_entity?.id || null,
      }).select().single();
      convId = conv?.id;
    }

    // 3. Construct System & User Prompt
    const systemPrompt = `You are ForecourIQ IQ Ask, an operational intelligence assistant for UK independent car dealerships.
You are assisting a user with role: "${userRole}".
Ground all answers strictly in the provided dealership facts below. Never invent vehicle registrations, customers, prices, or margin figures.
If the facts do not contain enough information to answer, state so honestly.

CURRENT DEALERSHIP FACTS:
- Retail Stock: ${facts.stock.totalUnits} units on plot (Avg age: ${facts.stock.averageDays} days, ${facts.stock.over60Days} units >60d, ${facts.stock.inPrep} in prep)
${facts.canViewMargin ? `- Total Invested: £${facts.stock.investedCapital?.toLocaleString()}, Potential Gross: £${facts.stock.potentialGross?.toLocaleString()}` : '- Margin Data: REDACTED (User lacks margin.read permission)'}
- Active Leads: ${facts.leads.totalActive} total (${facts.leads.unansweredCount} unanswered >48h, ${facts.leads.newTodayCount} new today)
- Active Deals: ${facts.deals.totalActive} (${facts.deals.depositsOutstanding} deposits outstanding, ${facts.deals.handoversThisWeek} handovers this week, ${facts.deals.blockedCount} blocked)
- Today Agenda: ${facts.agenda.todayAppointments} appointments, ${facts.agenda.todayPrepDue} prep deadlines due
- Market Intelligence: ${facts.intelligence.buyingOpportunities} buying opportunities, ${facts.intelligence.pricingAttentionCount} vehicles need pricing review
- Integrations: ${facts.integrations.liveAdverts} live adverts, ${facts.integrations.unconfiguredCount} unconfigured integrations

FORMAT:
Provide a direct, concise response. Highlight concrete evidence and state next operational actions clearly.`;

    const aiRes = await IQProvider.complete({
      dealershipId,
      userId,
      capability: 'ask',
      systemPrompt,
      userPrompt: req.question,
      untrustedInputs: [{ name: 'user_query', content: req.question }],
      maxTokens: 600,
    });

    // 4. Fallback deterministic response generator
    let answerText = aiRes.content;
    const evidence: Array<{ label: string; value: string | number; link?: string }> = [];
    const suggestedActions: Array<{ action_type: string; label: string; payload: Record<string, any> }> = [];

    const lower = req.question.toLowerCase();

    if (lower.includes('stock') || lower.includes('ageing') || lower.includes('aging') || lower.includes('capital')) {
      evidence.push(
        { label: 'Retail Stock on Plot', value: `${facts.stock.totalUnits} units` },
        { label: 'Average Stock Age', value: `${facts.stock.averageDays} days` },
        { label: 'Vehicles >60 Days', value: `${facts.stock.over60Days} units` }
      );
      if (facts.canViewMargin && facts.stock.investedCapital) {
        evidence.push({ label: 'Capital Invested', value: `£${facts.stock.investedCapital.toLocaleString()}` });
      }
      if (!answerText) {
        answerText = `You have ${facts.stock.totalUnits} retail units on plot with an average age of ${facts.stock.averageDays} days. There are ${facts.stock.over60Days} vehicles on plot past 60 days that warrant pricing or preparation review.`;
      }
    } else if (lower.includes('lead') || lower.includes('customer') || lower.includes('unanswered') || lower.includes('follow')) {
      evidence.push(
        { label: 'Active Leads', value: facts.leads.totalActive },
        { label: 'Unanswered >48h', value: facts.leads.unansweredCount }
      );
      if (!answerText) {
        answerText = `There are currently ${facts.leads.totalActive} active leads in the pipeline. ${facts.leads.unansweredCount} leads have had no contact recorded in over 48 hours and require immediate follow-up.`;
      }
    } else if (lower.includes('deal') || lower.includes('deposit') || lower.includes('handover') || lower.includes('block')) {
      evidence.push(
        { label: 'Active Deals', value: facts.deals.totalActive },
        { label: 'Deposits Outstanding', value: facts.deals.depositsOutstanding },
        { label: 'Blocked Deals', value: facts.deals.blockedCount }
      );
      if (!answerText) {
        answerText = `You have ${facts.deals.totalActive} active deals in progress. ${facts.deals.depositsOutstanding} deals have deposits outstanding, and ${facts.deals.blockedCount} deals have compliance or document blockers.`;
      }
    } else if (lower.includes('buy') || lower.includes('price') || lower.includes('pricing') || lower.includes('market') || lower.includes('opportunity')) {
      evidence.push(
        { label: 'Buying Opportunities', value: facts.intelligence.buyingOpportunities },
        { label: 'Pricing Reviews', value: facts.intelligence.pricingAttentionCount }
      );
      if (!answerText) {
        answerText = `IQ has identified ${facts.intelligence.buyingOpportunities} high-demand acquisition opportunities and ${facts.intelligence.pricingAttentionCount} vehicles with pricing attention signals.`;
      }
    } else {
      if (!answerText) {
        answerText = `Dealership summary: ${facts.stock.totalUnits} vehicles on plot, ${facts.leads.totalActive} active leads (${facts.leads.unansweredCount} overdue follow-ups), ${facts.deals.totalActive} deals in progress, and ${facts.agenda.todayAppointments} appointments scheduled today.`;
      }
      evidence.push(
        { label: 'Retail Stock', value: `${facts.stock.totalUnits} units` },
        { label: 'Active Leads', value: facts.leads.totalActive },
        { label: 'Today Appointments', value: facts.agenda.todayAppointments }
      );
    }

    // 5. Persist message in conversation
    if (convId) {
      await supabase.from('ai_messages').insert([
        {
          conversation_id: convId,
          dealership_id: dealershipId,
          user_id: userId,
          role: 'user',
          content: req.question,
        },
        {
          conversation_id: convId,
          dealership_id: dealershipId,
          user_id: null,
          role: 'assistant',
          content: answerText,
          evidence,
          suggested_actions: suggestedActions,
          tokens_used: aiRes.tokensUsed,
        }
      ]);
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'iq.question_asked',
      entity_type: 'ai_conversation',
      entity_id: convId || '',
      metadata: { question: req.question.slice(0, 100) },
    });

    return {
      answer: answerText,
      evidence,
      suggested_actions: suggestedActions,
      conversation_id: convId || '',
      model_used: aiRes.modelName,
      tokens_used: aiRes.tokensUsed,
    };
  }
};
