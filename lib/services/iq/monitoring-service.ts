import { createClient } from '@/lib/supabase/server';
import { ActionService } from './action-service';
import { RecommendationService } from './recommendation-service';
import { subDays, subMinutes } from 'date-fns';

export interface MonitoringRunResult {
  dealership_id: string;
  evaluated_at: string;
  is_circuit_breaker_active: boolean;
  actions_triggered: number;
  recommendations_generated: number;
  suppressed_duplicates: number;
}

export const MonitoringService = {
  /**
   * Evaluates deterministic condition rules across CRM and Stock.
   * Creates low-risk automated tasks or recommendations with strict duplicate suppression.
   */
  async evaluateConditions(dealershipId: string): Promise<MonitoringRunResult> {
    const supabase = await createClient();
    const now = new Date();

    // 1. Fetch dealership settings
    const { data: settings } = await supabase
      .from('dealership_iq_settings')
      .select('*')
      .eq('dealership_id', dealershipId)
      .maybeSingle();

    const isPaused = settings?.automation_paused ?? false;
    const thresholdMinutes = settings?.monitoring_rules?.unanswered_lead_threshold_minutes || 45;
    const thresholdDate = subMinutes(now, thresholdMinutes);

    let actionsTriggered = 0;
    let suppressedDuplicates = 0;

    // 2. Scan for unanswered leads past SLA threshold
    const { data: overdueLeads } = await supabase
      .from('leads')
      .select('id, first_name, last_name, assigned_to, created_at')
      .eq('dealership_id', dealershipId)
      .in('status', ['new', 'unassigned'])
      .lt('created_at', thresholdDate.toISOString());

    for (const lead of overdueLeads || []) {
      // Check for existing open task for this lead (Duplicate Suppression)
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('dealership_id', dealershipId)
        .eq('lead_id', lead.id)
        .eq('status', 'open')
        .maybeSingle();

      if (existingTask) {
        suppressedDuplicates++;
        continue;
      }

      // If circuit breaker is not active, trigger auto task creation
      if (!isPaused) {
        const res = await ActionService.requestAction(dealershipId, lead.assigned_to || 'system', {
          actionType: 'lead.create_followup',
          entityType: 'lead',
          entityId: lead.id,
          inputPayload: {
            lead_id: lead.id,
            title: `Automated SLA follow-up: ${lead.first_name} ${lead.last_name}`,
            description: `Lead unanswered for >${thresholdMinutes} minutes. Follow up immediately.`,
            assigned_to: lead.assigned_to,
          }
        });

        if (res.executed) {
          actionsTriggered++;
        }
      }
    }

    // 3. Scan & refresh proactive recommendations
    const recs = await RecommendationService.scanAndGenerate(dealershipId);

    return {
      dealership_id: dealershipId,
      evaluated_at: now.toISOString(),
      is_circuit_breaker_active: isPaused,
      actions_triggered: actionsTriggered,
      recommendations_generated: recs.length,
      suppressed_duplicates: suppressedDuplicates,
    };
  }
};
