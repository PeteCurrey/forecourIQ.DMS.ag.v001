'use client';

import { useState } from 'react';
import { DealershipOnboardingState, GoLiveEvaluationResult, OnboardingStepId } from '@/lib/types/platform';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingClientProps {
  initialState: DealershipOnboardingState;
}

const steps: { id: OnboardingStepId; label: string; description: string; actionUrl: string }[] = [
  { id: 'dealership', label: 'Dealership Details', description: 'Legal name, address, phone, FCA number.', actionUrl: '/settings?tab=dealership' },
  { id: 'locations', label: 'Locations', description: 'Add your forecourt locations.', actionUrl: '/settings?tab=dealership' },
  { id: 'users', label: 'Team Setup', description: 'Invite your admin and sales team.', actionUrl: '/settings?tab=team' },
  { id: 'stock', label: 'Stock Import', description: 'Import your current vehicle inventory.', actionUrl: '/stock/import' },
  { id: 'integrations', label: 'Integrations', description: 'Connect AutoTrader, DVLA, communications.', actionUrl: '/settings/integrations' },
  { id: 'communications', label: 'Communications', description: 'Configure SMS and email gateway.', actionUrl: '/settings/integrations' },
  { id: 'website', label: 'Dealer Website', description: 'Configure your customer-facing website.', actionUrl: '/settings/website' },
  { id: 'compliance', label: 'Compliance', description: 'Record FCA status and dealer disclosures.', actionUrl: '/settings?tab=dealership' },
  { id: 'billing', label: 'Billing', description: 'Set up your subscription for go-live.', actionUrl: '/settings/billing' },
  { id: 'review', label: 'Go-Live Review', description: 'Final readiness check before activation.', actionUrl: '#' },
];

export default function OnboardingClient({ initialState }: OnboardingClientProps) {
  const [state, setState] = useState(initialState);
  const [evaluation, setEvaluation] = useState<GoLiveEvaluationResult | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);

  const completedSet = new Set(state.steps_completed || []);

  async function runGoLiveCheck() {
    setLoadingEval(true);
    try {
      const res = await fetch('/api/onboarding/go-live');
      const data = await res.json();
      if (data.result) setEvaluation(data.result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEval(false);
    }
  }

  const completedCount = completedSet.size;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-10 reveal-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] tracking-tight">Dealership Setup</h1>
        <p className="text-sm text-[var(--pewter)] mt-1">
          Complete each step to go live. Our team reviews before activation.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg p-6 reveal-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--cream)]">Setup Progress</span>
          <span className="text-sm text-[var(--pewter)]">{completedCount} of {totalSteps} complete</span>
        </div>
        <div className="w-full bg-[var(--steel)] rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-[var(--pewter)] mt-2">{progressPct}% complete</p>
      </div>

      {/* Steps */}
      <div className="space-y-2 reveal-3">
        {steps.map((step, idx) => {
          const isComplete = completedSet.has(step.id);
          const isCurrent = state.current_step === step.id;
          const hasBlocker = state.blockers?.some((b: any) => b.step === step.id);

          return (
            <div
              key={step.id}
              className={cn(
                'bg-[var(--carbon)] border rounded-lg px-5 py-4 flex items-center gap-4 transition-colors',
                isCurrent ? 'border-[var(--cream)]/30 bg-[var(--asphalt)]' : 'border-[var(--steel)]',
                isComplete && 'opacity-75'
              )}
            >
              {/* Step number or check */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                isComplete ? 'bg-emerald-500 text-white' :
                hasBlocker ? 'bg-red-100 text-red-600' :
                isCurrent ? 'bg-[var(--cream)] text-[var(--void)]' :
                'bg-[var(--steel)] text-[var(--pewter)]'
              )}>
                {isComplete ? '✓' : hasBlocker ? '!' : idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', isCurrent ? 'text-[var(--cream)]' : 'text-[var(--cream)]')}>
                  {step.label}
                </p>
                <p className="text-xs text-[var(--pewter)] mt-0.5">{step.description}</p>
              </div>

              <div className="shrink-0">
                {isComplete ? (
                  <span className="text-xs text-emerald-600 font-medium">Complete</span>
                ) : step.id === 'review' ? (
                  <Button
                    onClick={runGoLiveCheck}
                    disabled={loadingEval}
                    className="text-xs h-7 bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 px-3"
                  >
                    {loadingEval ? 'Checking...' : 'Run Check'}
                  </Button>
                ) : (
                  <a
                    href={step.actionUrl}
                    className="text-xs text-[var(--pewter)] hover:text-[var(--cream)] underline underline-offset-2 transition-colors"
                  >
                    {isCurrent ? 'Set up →' : 'Configure'}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Go-Live Evaluation Result */}
      {evaluation && (
        <div className={cn(
          'reveal-4 bg-[var(--carbon)] border rounded-xl p-6 space-y-5',
          evaluation.isReady ? 'border-emerald-200' : 'border-amber-200'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-lg',
              evaluation.isReady ? 'bg-emerald-100' : 'bg-amber-100'
            )}>
              {evaluation.isReady ? '✓' : '⚠'}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--cream)]">
                {evaluation.isReady ? 'Ready for Go-Live Review' : 'Blockers Must Be Resolved'}
              </h3>
              <p className="text-xs text-[var(--pewter)]">
                Readiness score: {evaluation.score}/100 · {evaluation.passedChecks}/{evaluation.totalChecks} checks passed
              </p>
            </div>
          </div>

          {evaluation.blockers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Blockers</p>
              {evaluation.blockers.map(b => (
                <div key={b.code} className="bg-red-50 border border-red-200 rounded-md px-4 py-2.5 flex items-start gap-2">
                  <span className="text-red-600 text-xs mt-0.5">!</span>
                  <div>
                    <p className="text-xs font-medium text-red-700">{b.message}</p>
                    <a href={b.actionUrl} className="text-xs text-red-500 underline mt-0.5 inline-block">
                      Resolve →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {evaluation.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Recommendations</p>
              {evaluation.warnings.map(w => (
                <div key={w.code} className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 flex items-start gap-2">
                  <span className="text-amber-600 text-xs mt-0.5">●</span>
                  <p className="text-xs text-amber-700">{w.message}</p>
                </div>
              ))}
            </div>
          )}

          {evaluation.isReady && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
              <p className="text-xs text-emerald-700 font-medium">
                All required checks passed. Contact your ForecourIQ account manager to activate your pilot.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
