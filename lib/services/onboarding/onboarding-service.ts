import { createClient } from '@/lib/supabase/server';
import { 
  DealershipOnboardingState, 
  GoLiveEvaluationResult, 
  OnboardingBlocker, 
  OnboardingStepId,
  OnboardingStatus
} from '@/lib/types/platform';

export class OnboardingService {
  /**
   * Get or initialize onboarding state for a dealership.
   */
  static async getOnboardingState(dealershipId: string): Promise<DealershipOnboardingState> {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('dealership_onboarding')
      .select('*')
      .eq('dealership_id', dealershipId)
      .maybeSingle();

    if (existing) {
      return existing as DealershipOnboardingState;
    }

    // Initialize default state
    const initialState: Partial<DealershipOnboardingState> = {
      dealership_id: dealershipId,
      status: 'in_progress',
      current_step: 'dealership',
      steps_completed: [],
      blockers: [],
      metadata: {},
    };

    const { data: created, error } = await supabase
      .from('dealership_onboarding')
      .insert(initialState)
      .select('*')
      .single();

    if (error || !created) {
      return {
        dealership_id: dealershipId,
        status: 'in_progress',
        current_step: 'dealership',
        steps_completed: [],
        blockers: [],
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return created as DealershipOnboardingState;
  }

  /**
   * Complete a specific onboarding step.
   */
  static async completeStep(
    dealershipId: string, 
    step: OnboardingStepId, 
    nextStep?: OnboardingStepId
  ): Promise<DealershipOnboardingState> {
    const supabase = await createClient();
    const current = await this.getOnboardingState(dealershipId);

    const completed = new Set(current.steps_completed || []);
    completed.add(step);

    const nextCurrentStep = nextStep || (step === 'billing' ? 'review' : current.current_step);

    const { data: updated, error } = await supabase
      .from('dealership_onboarding')
      .update({
        steps_completed: Array.from(completed),
        current_step: nextCurrentStep,
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update onboarding step: ${error?.message || 'Unknown error'}`);
    }

    return updated as DealershipOnboardingState;
  }

  /**
   * Deterministically evaluate Go-Live readiness for a dealership.
   */
  static async evaluateGoLiveReadiness(dealershipId: string): Promise<GoLiveEvaluationResult> {
    const supabase = await createClient();

    // Query required domain tables in parallel
    const [
      { data: dealership },
      { data: locations },
      { data: admins },
      { count: stockCount },
      { data: subscription },
      { data: complianceRecord },
      { data: integrations },
      { data: websiteSettings }
    ] = await Promise.all([
      supabase.from('dealerships').select('*').eq('id', dealershipId).single(),
      supabase.from('dealership_locations').select('id, name').eq('dealership_id', dealershipId),
      supabase.from('profiles').select('id, role, is_active').eq('dealership_id', dealershipId).in('role', ['admin', 'dealer_principal']),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('dealership_id', dealershipId),
      supabase.from('subscriptions').select('*').eq('dealership_id', dealershipId).maybeSingle(),
      supabase.from('dealership_compliance_settings').select('*').eq('dealership_id', dealershipId).maybeSingle(),
      supabase.from('dealership_integrations').select('id, provider_id, status').eq('dealership_id', dealershipId),
      supabase.from('dealership_website_settings').select('*').eq('dealership_id', dealershipId).maybeSingle()
    ]);

    const blockers: OnboardingBlocker[] = [];
    const warnings: OnboardingBlocker[] = [];

    // 1. Dealership Identity Check
    const hasLegalIdentity = !!(dealership?.name && dealership?.city && dealership?.postcode && dealership?.phone);
    if (!hasLegalIdentity) {
      blockers.push({
        code: 'MISSING_DEALERSHIP_IDENTITY',
        step: 'dealership',
        message: 'Dealership legal name, address, postcode, and phone number are required.',
        severity: 'blocker',
        actionUrl: '/settings?tab=dealership',
      });
    }

    // 2. Primary Location Check
    const hasLocation = (locations && locations.length > 0) || !!dealership?.city;
    if (!hasLocation) {
      blockers.push({
        code: 'MISSING_LOCATION',
        step: 'locations',
        message: 'At least one operating forecourt location is required.',
        severity: 'blocker',
        actionUrl: '/settings?tab=dealership',
      });
    }

    // 3. Admin User Check
    const hasActiveAdmin = !!(admins && admins.some(a => a.is_active !== false));
    if (!hasActiveAdmin) {
      blockers.push({
        code: 'NO_ACTIVE_ADMIN',
        step: 'users',
        message: 'At least one active Dealer Principal or Administrator account must exist.',
        severity: 'blocker',
        actionUrl: '/settings?tab=team',
      });
    }

    // 4. Billing Check
    const isBillingValid = subscription ? ['active', 'trial'].includes(subscription.status) : !!(dealership?.subscription_status && ['active', 'trial'].includes(dealership.subscription_status));
    if (!isBillingValid) {
      blockers.push({
        code: 'BILLING_REQUIRED',
        step: 'billing',
        message: 'An active subscription or valid pilot trial is required to go live.',
        severity: 'blocker',
        actionUrl: '/settings/billing',
      });
    }

    // 5. Stock Check (Warning if 0 stock, not hard blocker)
    const hasStock = (stockCount || 0) > 0;
    if (!hasStock) {
      warnings.push({
        code: 'NO_STOCK_ON_FORECOURT',
        step: 'stock',
        message: 'No vehicles added or imported yet. You can import via CSV or add vehicles individually.',
        severity: 'warning',
        actionUrl: '/stock/import',
      });
    }

    // 6. Compliance Check
    const complianceReviewed = !!complianceRecord || !!dealership?.fca_number;
    if (!complianceReviewed) {
      warnings.push({
        code: 'COMPLIANCE_UNREVIEWED',
        step: 'compliance',
        message: 'FCA status and dealer disclosure documents have not been recorded.',
        severity: 'warning',
        actionUrl: '/settings?tab=dealership',
      });
    }

    // 7. Communications Check
    const commsIntegration = integrations?.some(i => ['sendgrid', 'resend', 'twilio', 'whatsapp'].includes(i.provider_id) && i.status === 'connected');
    if (!commsIntegration && !dealership?.email) {
      warnings.push({
        code: 'COMMS_UNCONFIGURED',
        step: 'communications',
        message: 'No external email or messaging gateway configured. System will use default internal routing.',
        severity: 'warning',
        actionUrl: '/settings/integrations',
      });
    }

    const checklist = {
      dealershipConfigured: hasLegalIdentity,
      primaryLocationConfigured: hasLocation,
      adminAccountActive: hasActiveAdmin,
      stockReadyOrImported: hasStock,
      billingConfigured: isBillingValid,
      complianceReviewed: complianceReviewed,
      communicationsVerified: commsIntegration || !!dealership?.email,
      websiteConfigured: !!websiteSettings || !!dealership?.website_url,
    };

    const checksArray = Object.values(checklist);
    const passedChecks = checksArray.filter(Boolean).length;
    const totalChecks = checksArray.length;
    const score = Math.round((passedChecks / totalChecks) * 100);
    const isReady = blockers.length === 0;

    // Persist evaluation blockers to onboarding table
    await supabase
      .from('dealership_onboarding')
      .update({
        blockers: blockers as any,
        status: isReady ? (score === 100 ? 'ready_for_review' : 'in_progress') : 'blocked',
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId);

    return {
      dealershipId,
      isReady,
      score,
      totalChecks,
      passedChecks,
      blockers,
      warnings,
      checklist,
    };
  }
}
