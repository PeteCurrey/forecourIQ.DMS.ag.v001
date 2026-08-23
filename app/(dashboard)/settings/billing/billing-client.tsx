'use client';

import { useState } from 'react';
import { DealershipPlan, PlanEntitlementsCheck, Subscription, SubscriptionStatus } from '@/lib/types/platform';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BillingClientProps {
  subscription: Subscription | null;
  plan: DealershipPlan;
  status: SubscriptionStatus;
  stockEntitlement: PlanEntitlementsCheck;
  userEntitlement: PlanEntitlementsCheck;
}

const statusLabels: Record<SubscriptionStatus, string> = {
  trial: 'Trial Active',
  active: 'Active',
  past_due: 'Payment Overdue',
  payment_failed: 'Payment Failed',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
};

const statusColors: Record<SubscriptionStatus, string> = {
  trial: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  past_due: 'bg-amber-50 text-amber-700 border-amber-200',
  payment_failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-[var(--steel)] text-[var(--pewter)] border-[var(--steel)]',
  suspended: 'bg-red-50 text-red-700 border-red-200',
};

const tierBadge: Record<string, string> = {
  starter: 'bg-[var(--steel)] text-[var(--pewter)]',
  professional: 'bg-blue-50 text-blue-700',
  elite: 'bg-amber-50 text-amber-800',
};

export default function BillingClient({
  subscription,
  plan,
  status,
  stockEntitlement,
  userEntitlement,
}: BillingClientProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);

  async function openBillingPortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setLoadingPortal(false);
    }
  }

  const stockPct = stockEntitlement.limit
    ? Math.min(100, Math.round((stockEntitlement.currentCount / stockEntitlement.limit) * 100))
    : 0;
  const userPct = userEntitlement.limit
    ? Math.min(100, Math.round((userEntitlement.currentCount / userEntitlement.limit) * 100))
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8 reveal-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] tracking-tight">Billing & Plan</h1>
        <p className="text-sm text-[var(--pewter)] mt-1">Manage your subscription, usage, and entitlements.</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg p-6 reveal-2">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide', tierBadge[plan.tier])}>
                {plan.tier}
              </span>
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full border', statusColors[status])}>
                {statusLabels[status]}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--cream)] mt-1">{plan.name}</h2>
            <p className="text-2xl font-light text-[var(--cream)] mt-1">
              £{plan.monthly_price_gbp.toFixed(0)}
              <span className="text-sm text-[var(--pewter)] font-normal">/month</span>
            </p>
          </div>
          <Button
            onClick={openBillingPortal}
            disabled={loadingPortal}
            className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-sm"
          >
            {loadingPortal ? 'Opening...' : 'Manage Billing'}
          </Button>
        </div>

        {subscription?.current_period_end && (
          <p className="text-xs text-[var(--pewter)] border-t border-[var(--steel)] pt-4">
            Next renewal: {new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        )}
        {status === 'trial' && subscription?.trial_ends_at && (
          <p className="text-xs text-[var(--pewter)] border-t border-[var(--steel)] pt-4">
            Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        )}
      </div>

      {/* Usage & Entitlements */}
      <div className="reveal-3 grid grid-cols-1 gap-4">
        <EntitlementBar
          label="Stock Vehicles"
          current={stockEntitlement.currentCount}
          limit={stockEntitlement.limit}
          pct={stockPct}
          warning={stockEntitlement.isSoftLimitApproaching}
          blocked={!stockEntitlement.allowed}
          upgradeMessage={stockEntitlement.reason}
        />
        <EntitlementBar
          label="Team Members"
          current={userEntitlement.currentCount}
          limit={userEntitlement.limit}
          pct={userPct}
          warning={false}
          blocked={!userEntitlement.allowed}
          upgradeMessage={userEntitlement.reason}
        />
      </div>

      {/* Plan Features */}
      <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg p-6 reveal-4">
        <h3 className="text-sm font-medium text-[var(--cream)] mb-4">Plan Features</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <FeatureRow label="Dealer Website" included={plan.website_included} />
          <FeatureRow label="IQ Operating Layer" included={plan.iq_included} />
          <FeatureRow label="Market Intelligence" included={plan.competitor_tracking} />
          <FeatureRow label="Accounting Sync" included={plan.accounting_sync} />
          <FeatureRow label="API Access" included={plan.api_access} />
          <FeatureRow label="Locations" value={plan.max_locations === null ? 'Unlimited' : `Up to ${plan.max_locations}`} />
        </div>
      </div>
    </div>
  );
}

function EntitlementBar({
  label, current, limit, pct, warning, blocked, upgradeMessage
}: {
  label: string;
  current: number;
  limit: number | null;
  pct: number;
  warning?: boolean;
  blocked?: boolean;
  upgradeMessage?: string;
}) {
  return (
    <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--cream)]">{label}</span>
        <span className="text-sm text-[var(--pewter)]">
          {current} / {limit === null ? '∞' : limit}
        </span>
      </div>
      {limit !== null && (
        <div className="w-full bg-[var(--steel)] rounded-full h-1.5">
          <div
            className={cn(
              'h-1.5 rounded-full transition-all',
              blocked ? 'bg-red-500' : warning ? 'bg-amber-400' : 'bg-emerald-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {upgradeMessage && (
        <p className="text-xs text-red-600 mt-2">{upgradeMessage}</p>
      )}
      {warning && !blocked && (
        <p className="text-xs text-amber-600 mt-2">Approaching your plan limit — consider upgrading.</p>
      )}
    </div>
  );
}

function FeatureRow({ label, included, value }: { label: string; included?: boolean; value?: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[var(--steel)] last:border-0">
      {value ? (
        <span className="text-xs text-emerald-600">•</span>
      ) : (
        <span className={cn('text-xs', included ? 'text-emerald-600' : 'text-[var(--pewter)]')}>
          {included ? '✓' : '–'}
        </span>
      )}
      <span className={cn('text-sm', included !== false ? 'text-[var(--cream)]' : 'text-[var(--pewter)] line-through')}>
        {label}
      </span>
      {value && <span className="ml-auto text-xs text-[var(--pewter)]">{value}</span>}
    </div>
  );
}
