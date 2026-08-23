import { createClient } from '@/lib/supabase/server';
import { 
  DealershipPlan, 
  PlanEntitlementsCheck, 
  PlanTier, 
  Subscription, 
  SubscriptionStatus 
} from '@/lib/types/platform';
import { stripe } from '@/lib/stripe/server';

export class BillingService {
  /**
   * Get active subscription and plan details for a dealership.
   */
  static async getSubscription(dealershipId: string): Promise<{
    subscription: Subscription | null;
    plan: DealershipPlan;
    status: SubscriptionStatus;
  }> {
    const supabase = await createClient();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, plan:dealership_plans(*)')
      .eq('dealership_id', dealershipId)
      .maybeSingle();

    if (sub && sub.plan) {
      return {
        subscription: sub as Subscription,
        plan: sub.plan as DealershipPlan,
        status: sub.status as SubscriptionStatus,
      };
    }

    // Default fallback to professional trial or starter
    const { data: defaultPlan } = await supabase
      .from('dealership_plans')
      .select('*')
      .eq('id', 'professional')
      .single();

    const fallbackPlan: DealershipPlan = defaultPlan || {
      id: 'professional',
      name: 'Professional Plan',
      tier: 'professional',
      monthly_price_gbp: 299,
      max_vehicles: 100,
      max_users: 10,
      max_locations: 3,
      website_included: true,
      iq_included: true,
      competitor_tracking: true,
      accounting_sync: true,
      api_access: false,
      features: ['Up to 100 vehicles', 'IQ Operating Layer'],
      created_at: new Date().toISOString(),
    };

    return {
      subscription: null,
      plan: fallbackPlan,
      status: 'trial',
    };
  }

  /**
   * Check if a dealership is entitled to perform an action based on their plan limits.
   */
  static async checkStockEntitlement(dealershipId: string): Promise<PlanEntitlementsCheck> {
    const supabase = await createClient();
    const { plan } = await this.getSubscription(dealershipId);

    const { count } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId)
      .not('status', 'in', '("sold","completed","archived")');

    const currentCount = count || 0;
    const limit = plan.max_vehicles;

    if (limit === null) {
      return {
        allowed: true,
        currentCount,
        limit: null,
        planTier: plan.tier,
      };
    }

    const isSoftLimitApproaching = currentCount >= Math.floor(limit * 0.85);
    const isHardLimitReached = currentCount >= limit;

    return {
      allowed: !isHardLimitReached,
      reason: isHardLimitReached ? `You have reached your plan limit of ${limit} active vehicles on the ${plan.name}. Please upgrade to add more stock.` : undefined,
      isSoftLimitApproaching,
      currentCount,
      limit,
      planTier: plan.tier,
    };
  }

  /**
   * Check user invitation entitlement.
   */
  static async checkUserEntitlement(dealershipId: string): Promise<PlanEntitlementsCheck> {
    const supabase = await createClient();
    const { plan } = await this.getSubscription(dealershipId);

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId)
      .eq('is_active', true);

    const currentCount = count || 0;
    const limit = plan.max_users;

    if (limit === null) {
      return {
        allowed: true,
        currentCount,
        limit: null,
        planTier: plan.tier,
      };
    }

    const isHardLimitReached = currentCount >= limit;

    return {
      allowed: !isHardLimitReached,
      reason: isHardLimitReached ? `You have reached your team limit of ${limit} users on the ${plan.name}. Upgrade to invite more team members.` : undefined,
      currentCount,
      limit,
      planTier: plan.tier,
    };
  }

  /**
   * Generate a secure Stripe Customer Portal session.
   */
  static async createCustomerPortalSession(dealershipId: string, returnUrl?: string): Promise<{ url: string }> {
    const supabase = await createClient();

    const { data: dealership } = await supabase
      .from('dealerships')
      .select('stripe_customer_id, name')
      .eq('id', dealershipId)
      .single();

    if (!dealership?.stripe_customer_id) {
      throw new Error('No linked Stripe customer account found for this dealership.');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://forecour-iq-dms-ag-v001.vercel.app';

    const session = await stripe.billingPortal.sessions.create({
      customer: dealership.stripe_customer_id,
      return_url: returnUrl || `${appUrl}/settings?tab=billing`,
    });

    return { url: session.url };
  }
}
