'use client';

import { useState } from 'react';
import { DealershipPlatformSummary, PlatformGlobalMetrics, PlatformOperator } from '@/lib/types/platform';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlatformClientProps {
  metrics: PlatformGlobalMetrics;
  dealerships: DealershipPlatformSummary[];
  operator: PlatformOperator;
}

const lifecycleColors: Record<string, string> = {
  prospect: 'bg-[var(--steel)] text-[var(--pewter)]',
  onboarding: 'bg-blue-50 text-blue-700',
  pilot: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  past_due: 'bg-orange-50 text-orange-700',
  suspended: 'bg-red-50 text-red-700',
  cancelled: 'bg-[var(--steel)] text-[var(--pewter)] opacity-60',
  archived: 'bg-[var(--steel)] text-[var(--pewter)] opacity-40',
};

export default function PlatformClient({ metrics, dealerships, operator }: PlatformClientProps) {
  const [search, setSearch] = useState('');
  const [pilotAction, setPilotAction] = useState<{
    dealershipId: string;
    action: 'start' | 'pause';
    name: string;
  } | null>(null);
  const [pilotNotes, setPilotNotes] = useState('');
  const [pilotLoading, setPilotLoading] = useState(false);
  const [pilotMessage, setPilotMessage] = useState('');

  const filtered = dealerships.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.city?.toLowerCase().includes(search.toLowerCase())
  );

  async function executePilotAction() {
    if (!pilotAction) return;
    setPilotLoading(true);
    setPilotMessage('');
    try {
      const res = await fetch('/api/platform/pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealershipId: pilotAction.dealershipId,
          action: pilotAction.action,
          notes: pilotAction.action === 'start' ? pilotNotes : undefined,
          reason: pilotAction.action === 'pause' ? pilotNotes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setPilotMessage(data.message || 'Action completed');
      setPilotAction(null);
      setPilotNotes('');
      // Reload to reflect new status
      window.location.reload();
    } catch (err: any) {
      setPilotMessage(err.message);
    } finally {
      setPilotLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 reveal-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
              PLATFORM OPERATOR
            </span>
            <span className="text-xs text-[var(--pewter)]">{operator.full_name} · {operator.role}</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] tracking-tight">Platform Console</h1>
          <p className="text-sm text-[var(--pewter)] mt-1">ForecourIQ operator view — all dealerships and system health.</p>
        </div>
      </div>

      {/* Global Metrics Strip */}
      <div className="grid grid-cols-6 gap-3 reveal-2">
        {[
          { label: 'Total Dealerships', value: metrics.totalDealerships },
          { label: 'Active Pilots', value: metrics.activePilots },
          { label: 'Subscriptions', value: metrics.activeSubscriptions },
          { label: 'Est. MRR', value: `£${(metrics.estimatedMRR).toLocaleString()}` },
          { label: 'Open Cases', value: metrics.openSupportCases },
          {
            label: 'System Health',
            value: metrics.systemHealth === 'healthy' ? '✓ Healthy' : '⚠ Degraded',
            className: metrics.systemHealth === 'healthy' ? 'text-emerald-600' : 'text-amber-600',
          },
        ].map(({ label, value, className }) => (
          <div key={label} className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg px-4 py-3">
            <p className="text-xs text-[var(--pewter)] mb-1">{label}</p>
            <p className={cn('text-lg font-semibold text-[var(--cream)]', className)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pilot Action Confirmation Modal */}
      {pilotAction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--void)] border border-[var(--steel)] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <h2 className="text-base font-semibold text-[var(--cream)]">
              {pilotAction.action === 'start' ? '▶ Start Pilot' : '⏸ Pause Pilot'}
            </h2>
            <p className="text-sm text-[var(--pewter)]">
              {pilotAction.action === 'start'
                ? `Activate a controlled pilot for ${pilotAction.name}. Go-Live readiness will be verified.`
                : `Suspend the pilot for ${pilotAction.name}. The dealership will be unable to operate normally.`}
            </p>
            <div>
              <label className="block text-xs font-medium text-[var(--pewter)] mb-1.5">
                {pilotAction.action === 'start' ? 'Pilot Notes (optional)' : 'Reason for Suspension *'}
              </label>
              <textarea
                value={pilotNotes}
                onChange={e => setPilotNotes(e.target.value)}
                rows={3}
                className="w-full bg-[var(--carbon)] border border-[var(--steel)] rounded-md px-3 py-2 text-sm text-[var(--cream)] resize-none focus:outline-none"
                placeholder={pilotAction.action === 'start' ? 'e.g. Approved by Peter — 90-day pilot.' : 'e.g. Billing failure — payment in arrears.'}
              />
            </div>
            {pilotMessage && (
              <p className="text-xs text-red-500">{pilotMessage}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setPilotAction(null); setPilotNotes(''); }} className="text-sm">Cancel</Button>
              <Button
                onClick={executePilotAction}
                disabled={pilotLoading || (pilotAction.action === 'pause' && !pilotNotes.trim())}
                className={cn(
                  'text-sm',
                  pilotAction.action === 'start'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                )}
              >
                {pilotLoading ? 'Processing...' : pilotAction.action === 'start' ? 'Confirm — Start Pilot' : 'Confirm — Pause Pilot'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dealership Directory */}
      <div className="reveal-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--pewter)]">
            Dealerships ({filtered.length})
          </h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dealerships..."
            className="bg-[var(--carbon)] border border-[var(--steel)] rounded-md px-3 py-1.5 text-sm text-[var(--cream)] placeholder:text-[var(--pewter)] focus:outline-none w-60"
          />
        </div>

        <div className="space-y-2">
          {filtered.map(d => (
            <div
              key={d.id}
              className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg px-5 py-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', lifecycleColors[d.lifecycle_status] || 'bg-[var(--steel)] text-[var(--pewter)]')}>
                    {d.lifecycle_status}
                  </span>
                  {d.is_demo && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">DEMO</span>
                  )}
                </div>
                <p className="text-sm font-medium text-[var(--cream)]">{d.name}</p>
                <p className="text-xs text-[var(--pewter)]">{d.city} · {d.stock_count} vehicles · {d.user_count} users</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {d.open_support_cases > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {d.open_support_cases} cases
                  </span>
                )}
                {d.lifecycle_status === 'pilot' || d.lifecycle_status === 'onboarding' ? (
                  <>
                    {d.lifecycle_status !== 'pilot' && (
                      <Button
                        onClick={() => setPilotAction({ dealershipId: d.id, action: 'start', name: d.name })}
                        className="text-xs h-7 bg-emerald-600 text-white hover:bg-emerald-700 px-3"
                      >
                        ▶ Start Pilot
                      </Button>
                    )}
                    {d.lifecycle_status === 'pilot' && (
                      <Button
                        onClick={() => setPilotAction({ dealershipId: d.id, action: 'pause', name: d.name })}
                        className="text-xs h-7 bg-red-600 text-white hover:bg-red-700 px-3"
                      >
                        ⏸ Pause Pilot
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-center text-[var(--pewter)] py-12">No dealerships match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
