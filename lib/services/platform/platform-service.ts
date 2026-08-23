import { createClient } from '@/lib/supabase/server';
import { 
  DealershipPlatformSummary, 
  PlatformGlobalMetrics, 
  PlatformOperator 
} from '@/lib/types/platform';
import { OnboardingService } from '@/lib/services/onboarding/onboarding-service';

export class PlatformService {
  /**
   * Verify if a user is an authorized ForecourIQ platform operator.
   */
  static async verifyPlatformOperator(userId: string): Promise<PlatformOperator | null> {
    const supabase = await createClient();

    const { data: operator } = await supabase
      .from('platform_operators')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (operator) {
      return operator as PlatformOperator;
    }

    // Fallback: check profile flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_platform_admin) {
      return {
        id: userId,
        user_id: userId,
        email: profile.email || 'operator@forecouriq.co.uk',
        full_name: profile.full_name || 'Platform Operator',
        role: 'superadmin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Get global platform metrics across all dealerships.
   */
  static async getGlobalMetrics(): Promise<PlatformGlobalMetrics> {
    const supabase = await createClient();

    const [
      { data: dealerships },
      { data: subscriptions },
      { count: openCasesCount },
      { data: backgroundJobs }
    ] = await Promise.all([
      supabase.from('dealerships').select('id, lifecycle_status'),
      supabase.from('subscriptions').select('plan_id, status').eq('status', 'active'),
      supabase.from('support_cases').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress', 'waiting_on_forecouriq']),
      supabase.from('data_import_jobs').select('status, created_at').eq('status', 'failed')
    ]);

    const totalDealerships = dealerships?.length || 0;
    const activePilots = (dealerships || []).filter(d => d.lifecycle_status === 'pilot').length;
    const activeSubscriptions = subscriptions?.length || 0;

    // Approximate MRR from active subscriptions
    const planPrices: Record<string, number> = { starter: 149, professional: 299, elite: 499 };
    const estimatedMRR = (subscriptions || []).reduce((sum, s) => sum + (planPrices[s.plan_id] || 299), 0);

    const failedJobs24h = (backgroundJobs || []).length;

    return {
      totalDealerships,
      activePilots,
      activeSubscriptions,
      estimatedMRR,
      openSupportCases: openCasesCount || 0,
      systemHealth: failedJobs24h > 10 ? 'degraded' : 'healthy',
      failedJobs24h,
      aiProviderHealth: 'operational',
    };
  }

  /**
   * List all dealerships with operational health summary.
   */
  static async listDealerships(): Promise<DealershipPlatformSummary[]> {
    const supabase = await createClient();

    const { data: dealerships, error } = await supabase
      .from('dealerships')
      .select('*, subscriptions(*), profiles(count), vehicles(count), support_cases(count)')
      .order('created_at', { ascending: false });

    if (error || !dealerships) {
      console.error('Error listing dealerships for platform:', error);
      return [];
    }

    return dealerships.map((d: any) => ({
      id: d.id,
      name: d.name,
      city: d.city,
      lifecycle_status: d.lifecycle_status || 'onboarding',
      subscription_status: d.subscriptions?.[0]?.status || d.subscription_status,
      plan_tier: d.subscriptions?.[0]?.plan_id || d.subscription_tier || 'professional',
      stock_count: d.vehicles?.[0]?.count || 0,
      user_count: d.profiles?.[0]?.count || 0,
      open_support_cases: d.support_cases?.[0]?.count || 0,
      pilot_started_at: d.pilot_started_at,
      pilot_owner: d.pilot_owner,
      is_demo: d.is_demo || false,
      created_at: d.created_at,
    }));
  }

  /**
   * Authorize and activate a dealership pilot (`START PILOT`).
   */
  static async startPilot(
    dealershipId: string, 
    operatorId: string, 
    pilotNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    // 1. Run deterministic Go-Live check
    const readiness = await OnboardingService.evaluateGoLiveReadiness(dealershipId);
    if (!readiness.isReady) {
      const blockerMsgs = readiness.blockers.map(b => b.message).join('; ');
      throw new Error(`Cannot start pilot: Blockers remain unresolved (${blockerMsgs})`);
    }

    // 2. Transition dealership lifecycle to pilot
    const { error: updateErr } = await supabase
      .from('dealerships')
      .update({
        lifecycle_status: 'pilot',
        pilot_started_at: new Date().toISOString(),
        pilot_notes: pilotNotes || 'Controlled pilot approved by platform operator',
      })
      .eq('id', dealershipId);

    if (updateErr) {
      throw new Error(`Failed to activate pilot: ${updateErr.message}`);
    }

    // 3. Log platform audit event
    await supabase.from('platform_audit_logs').insert({
      operator_id: operatorId,
      dealership_id: dealershipId,
      action: 'dealership.pilot_started',
      entity_type: 'dealership',
      entity_id: dealershipId,
      metadata: { readinessScore: readiness.score, pilotNotes },
    });

    // 4. Log security event
    await supabase.from('security_events').insert({
      dealership_id: dealershipId,
      event_type: 'pilot_started',
      metadata: { activatedByOperator: operatorId },
    });

    return { success: true, message: 'Pilot successfully activated for dealership' };
  }

  /**
   * Pause/Suspend a dealership pilot (`PAUSE PILOT`).
   */
  static async pausePilot(
    dealershipId: string, 
    operatorId: string, 
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    const { error: updateErr } = await supabase
      .from('dealerships')
      .update({
        lifecycle_status: 'suspended',
        deactivation_reason: reason,
      })
      .eq('id', dealershipId);

    if (updateErr) {
      throw new Error(`Failed to pause pilot: ${updateErr.message}`);
    }

    // Log platform audit event
    await supabase.from('platform_audit_logs').insert({
      operator_id: operatorId,
      dealership_id: dealershipId,
      action: 'dealership.pilot_paused',
      entity_type: 'dealership',
      entity_id: dealershipId,
      metadata: { reason },
    });

    // Log security event
    await supabase.from('security_events').insert({
      dealership_id: dealershipId,
      event_type: 'pilot_paused',
      metadata: { pausedByOperator: operatorId, reason },
    });

    return { success: true, message: 'Dealership pilot successfully paused' };
  }
}
