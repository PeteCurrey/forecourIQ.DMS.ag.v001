'use client';

import { useState } from 'react';
import { 
  DealershipPlatformSummary, 
  PlatformGlobalMetrics, 
  PlatformOperator,
  PilotHealthRecord 
} from '@/lib/types/platform';
import { DealerFeedback, FeedbackStatus } from '@/lib/types/feedback';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Users, 
  Car, 
  MessageSquare, 
  HelpCircle, 
  Bug, 
  Sparkles, 
  Gauge, 
  Activity, 
  TrendingUp,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface PlatformClientProps {
  metrics: PlatformGlobalMetrics;
  dealerships: DealershipPlatformSummary[];
  pilotHealth: PilotHealthRecord[];
  feedbackList: DealerFeedback[];
  workflowAdoption: {
    totalDealerships: number;
    crmAdoptionPct: number;
    dealDeskAdoptionPct: number;
    iqAdoptionPct: number;
    websiteAdoptionPct: number;
    transfersAdoptionPct: number;
    chatAdoptionPct: number;
  };
  operator: PlatformOperator;
}

const riskColors = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  attention: 'bg-amber-50 text-amber-700 border-amber-200',
  at_risk: 'bg-orange-50 text-orange-700 border-orange-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
};

const lifecycleColors: Record<string, string> = {
  prospect: 'bg-steel text-pewter',
  onboarding: 'bg-blue-50 text-blue-700',
  pilot: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  past_due: 'bg-orange-50 text-orange-700',
  suspended: 'bg-red-50 text-red-700',
  cancelled: 'bg-steel text-pewter opacity-60',
  archived: 'bg-steel text-pewter opacity-40',
};

export default function PlatformClient({
  metrics,
  dealerships,
  pilotHealth,
  feedbackList: initialFeedback,
  workflowAdoption,
  operator,
}: PlatformClientProps) {
  const [activeTab, setActiveTab] = useState<'pilots' | 'dealerships' | 'feedback' | 'adoption'>('pilots');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<DealerFeedback[]>(initialFeedback);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackStatus | 'all'>('all');
  
  // Pilot Action Modal State
  const [pilotAction, setPilotAction] = useState<{
    dealershipId: string;
    action: 'start' | 'pause';
    name: string;
  } | null>(null);
  const [pilotNotes, setPilotNotes] = useState('');
  const [pilotLoading, setPilotLoading] = useState(false);
  const [pilotMessage, setPilotMessage] = useState('');

  // Triage feedback handler
  async function handleUpdateFeedbackStatus(id: string, status: FeedbackStatus) {
    try {
      const res = await fetch(`/api/platform/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, releaseTag: '1.0.0-rc.1' }),
      });
      if (res.ok) {
        setFeedback(prev => prev.map(f => f.id === id ? { ...f, status, release_tag: '1.0.0-rc.1' } : f));
      }
    } catch (err) {
      console.error('Failed to update feedback:', err);
    }
  }

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
      window.location.reload();
    } catch (err: any) {
      setPilotMessage(err.message);
    } finally {
      setPilotLoading(false);
    }
  }

  const filteredDealerships = dealerships.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.city?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFeedback = feedback.filter(f => {
    if (feedbackFilter === 'all') return true;
    return f.status === feedbackFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 reveal-1">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-semibold uppercase">
              PLATFORM CONSOLE
            </span>
            <span className="text-xs text-pewter">{operator.full_name} · {operator.role}</span>
            <span className="font-mono text-xs bg-asphalt px-2 py-0.5 rounded text-cream">
              v1.0.0-rc.1
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-cream tracking-tight">Platform Operations & Pilot Readiness</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-positive inline-block animate-pulse" />
          <span className="text-xs text-cream font-medium">All Core DMS Gateways Operational</span>
        </div>
      </div>

      {/* 2. Global Metric KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-carbon border border-steel rounded-lg p-4">
          <p className="text-[11px] font-medium text-pewter uppercase tracking-wider mb-1">Total Dealerships</p>
          <div className="text-2xl font-semibold text-cream tabular-nums">{metrics.totalDealerships}</div>
          <p className="text-[11px] text-pewter mt-1">{metrics.activePilots} active pilots</p>
        </div>
        <div className="bg-carbon border border-steel rounded-lg p-4">
          <p className="text-[11px] font-medium text-pewter uppercase tracking-wider mb-1">Subscriptions</p>
          <div className="text-2xl font-semibold text-cream tabular-nums">{metrics.activeSubscriptions}</div>
          <p className="text-[11px] text-pewter mt-1">Est. MRR: £{metrics.estimatedMRR.toLocaleString()}</p>
        </div>
        <div className="bg-carbon border border-steel rounded-lg p-4">
          <p className="text-[11px] font-medium text-pewter uppercase tracking-wider mb-1">Open Support Cases</p>
          <div className={cn('text-2xl font-semibold tabular-nums', metrics.openSupportCases > 0 ? 'text-amber-500' : 'text-cream')}>
            {metrics.openSupportCases}
          </div>
          <p className="text-[11px] text-pewter mt-1">SLA target &lt; 2h</p>
        </div>
        <div className="bg-carbon border border-steel rounded-lg p-4">
          <p className="text-[11px] font-medium text-pewter uppercase tracking-wider mb-1">Feedback Triage Queue</p>
          <div className="text-2xl font-semibold text-cream tabular-nums">
            {feedback.filter(f => f.status === 'new').length}
          </div>
          <p className="text-[11px] text-pewter mt-1">New dealer reports</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-steel pb-3 text-xs">
        {[
          { id: 'pilots', label: `Pilot Health Matrix (${pilotHealth.length})` },
          { id: 'feedback', label: `Dealer Feedback (${feedback.length})` },
          { id: 'adoption', label: 'Workflow Adoption' },
          { id: 'dealerships', label: `All Dealerships (${dealerships.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3 py-1.5 rounded font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-asphalt text-cream font-semibold'
                : 'text-pewter hover:text-cream'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'pilots' && (
        <div className="space-y-4">
          <div className="bg-carbon border border-steel rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-asphalt text-pewter border-b border-steel">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dealership</th>
                    <th className="px-4 py-3 font-medium">Pilot Stage</th>
                    <th className="px-4 py-3 font-medium">Risk Status</th>
                    <th className="px-4 py-3 font-medium text-center">Active Users</th>
                    <th className="px-4 py-3 font-medium text-center">Stock</th>
                    <th className="px-4 py-3 font-medium text-center">Leads</th>
                    <th className="px-4 py-3 font-medium text-center">Deals</th>
                    <th className="px-4 py-3 font-medium text-center">Support Cases</th>
                    <th className="px-4 py-3 font-medium">Assigned Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel text-cream">
                  {pilotHealth.map((p) => (
                    <tr key={p.dealershipId} className="hover:bg-asphalt/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-cream">{p.name}</div>
                        <div className="text-[11px] text-pewter">{p.city || 'United Kingdom'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium capitalize', lifecycleColors[p.pilotStage])}>
                          {p.pilotStage}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2 py-0.5 rounded border text-[11px] font-semibold capitalize', riskColors[p.riskStatus])}>
                          {p.riskStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono tabular-nums">{p.activeUsersCount}</td>
                      <td className="px-4 py-3.5 text-center font-mono tabular-nums">{p.stockCount}</td>
                      <td className="px-4 py-3.5 text-center font-mono tabular-nums">{p.leadsCount}</td>
                      <td className="px-4 py-3.5 text-center font-mono tabular-nums">{p.dealsCount}</td>
                      <td className="px-4 py-3.5 text-center font-mono tabular-nums">
                        <span className={cn(p.openCasesCount > 0 ? 'text-amber-500 font-semibold' : 'text-pewter')}>
                          {p.openCasesCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-pewter">{p.pilotOwner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pilotHealth.length === 0 && (
                <div className="py-12 text-center text-xs text-pewter">No active pilot dealerships recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 text-xs">
            {(['all', 'new', 'reviewed', 'planned', 'resolved', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFeedbackFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs capitalize',
                  feedbackFilter === f ? 'bg-asphalt text-cream font-semibold' : 'text-pewter hover:text-cream'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="bg-carbon border border-steel rounded-lg overflow-hidden">
            <div className="divide-y divide-steel">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="p-4 space-y-2 hover:bg-asphalt/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-asphalt text-pewter border border-steel">
                          {item.category}
                        </span>
                        <span className="text-xs font-semibold text-cream">{item.title}</span>
                        {item.release_tag && (
                          <span className="text-[10px] font-mono bg-blue-tint text-blue px-1.5 py-0.2 rounded border border-blue/20">
                            {item.release_tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-pewter mt-1 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value as FeedbackStatus)}
                        className="bg-void border border-steel rounded px-2 py-1 text-xs text-cream focus:outline-none capitalize"
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="planned">Planned</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] text-pewter flex items-center gap-3 pt-1">
                    <span>Dealership: <strong className="text-cream">{item.dealership?.name || 'Unknown'}</strong></span>
                    <span>Route: <strong className="text-cream font-mono">{item.route || '/'}</strong></span>
                    <span>Version: <strong className="text-cream font-mono">{item.app_version}</strong></span>
                    <span>Submitted: {new Date(item.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              ))}

              {filteredFeedback.length === 0 && (
                <div className="py-12 text-center text-xs text-pewter">No feedback tickets in this view.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'adoption' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-carbon border border-steel rounded-lg p-5 space-y-2">
            <div className="text-xs font-medium text-pewter uppercase">CRM & Lead Pipeline</div>
            <div className="text-3xl font-semibold text-cream tabular-nums">{workflowAdoption.crmAdoptionPct}%</div>
            <p className="text-[11px] text-pewter">Dealerships actively receiving and responding to enquiries.</p>
          </div>
          <div className="bg-carbon border border-steel rounded-lg p-5 space-y-2">
            <div className="text-xs font-medium text-pewter uppercase">Deal Desk & Finance</div>
            <div className="text-3xl font-semibold text-cream tabular-nums">{workflowAdoption.dealDeskAdoptionPct}%</div>
            <p className="text-[11px] text-pewter">Dealers creating structured sales, part-exchanges, and orders.</p>
          </div>
          <div className="bg-carbon border border-steel rounded-lg p-5 space-y-2">
            <div className="text-xs font-medium text-pewter uppercase">IQ Intelligence Engine</div>
            <div className="text-3xl font-semibold text-cream tabular-nums">{workflowAdoption.iqAdoptionPct}%</div>
            <p className="text-[11px] text-pewter">Dealers interacting with daily briefings and recommendations.</p>
          </div>
          <div className="bg-carbon border border-steel rounded-lg p-5 space-y-2">
            <div className="text-xs font-medium text-pewter uppercase">Dealer Website Retailing</div>
            <div className="text-3xl font-semibold text-cream tabular-nums">{workflowAdoption.websiteAdoptionPct}%</div>
            <p className="text-[11px] text-pewter">Dealers with active digital showroom and lead generation.</p>
          </div>
          <div className="bg-carbon border border-steel rounded-lg p-5 space-y-2">
            <div className="text-xs font-medium text-pewter uppercase">Stock Movements</div>
            <div className="text-3xl font-semibold text-cream tabular-nums">{workflowAdoption.transfersAdoptionPct}%</div>
            <p className="text-[11px] text-pewter">Multi-site dealerships moving inventory between forecourts.</p>
          </div>
          <div className="bg-carbon border border-steel rounded-lg p-5 space-y-2">
            <div className="text-xs font-medium text-pewter uppercase">Team Chat</div>
            <div className="text-3xl font-semibold text-cream tabular-nums">{workflowAdoption.chatAdoptionPct}%</div>
            <p className="text-[11px] text-pewter">Internal channels and vehicle-linked conversations.</p>
          </div>
        </div>
      )}

      {activeTab === 'dealerships' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dealerships by name or city..."
              className="bg-carbon border border-steel rounded-md px-3 py-1.5 text-xs text-cream placeholder:text-pewter focus:outline-none w-72"
            />
          </div>

          <div className="bg-carbon border border-steel rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-asphalt text-pewter border-b border-steel">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dealership</th>
                    <th className="px-4 py-3 font-medium">Lifecycle</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium text-center">Stock</th>
                    <th className="px-4 py-3 font-medium text-center">Users</th>
                    <th className="px-4 py-3 font-medium text-center">Cases</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel text-cream">
                  {filteredDealerships.map((d) => (
                    <tr key={d.id} className="hover:bg-asphalt/40 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-cream">{d.name}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium capitalize', lifecycleColors[d.lifecycle_status])}>
                          {d.lifecycle_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 capitalize text-pewter">{d.plan_tier || 'Professional'}</td>
                      <td className="px-4 py-3.5 text-center font-mono">{d.stock_count}</td>
                      <td className="px-4 py-3.5 text-center font-mono">{d.user_count}</td>
                      <td className="px-4 py-3.5 text-center font-mono">{d.open_support_cases}</td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        {d.lifecycle_status === 'onboarding' && (
                          <Button
                            size="sm"
                            onClick={() => setPilotAction({ dealershipId: d.id, action: 'start', name: d.name })}
                            className="bg-cream text-void hover:bg-cream/90 text-xs h-7"
                          >
                            Start Pilot
                          </Button>
                        )}
                        {d.lifecycle_status === 'pilot' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setPilotAction({ dealershipId: d.id, action: 'pause', name: d.name })}
                            className="text-xs h-7"
                          >
                            Pause Pilot
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pilot Action Modal */}
      {pilotAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-sm font-semibold text-cream">
              {pilotAction.action === 'start' ? 'Authorize & Start Pilot' : 'Pause Dealership Pilot'}
            </h2>
            <p className="text-xs text-pewter">
              Dealership: <strong className="text-cream">{pilotAction.name}</strong>
            </p>
            <div>
              <label className="block text-xs font-medium text-pewter mb-1">
                {pilotAction.action === 'start' ? 'Operator Notes' : 'Pause Reason *'}
              </label>
              <textarea
                value={pilotNotes}
                onChange={e => setPilotNotes(e.target.value)}
                rows={3}
                className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream placeholder:text-pewter focus:outline-none resize-none"
                placeholder="Document reason for operator audit trail..."
                required={pilotAction.action === 'pause'}
              />
            </div>
            {pilotMessage && <p className="text-xs text-red-500">{pilotMessage}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t border-steel">
              <Button type="button" variant="ghost" onClick={() => setPilotAction(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={executePilotAction}
                disabled={pilotLoading}
                className={cn('text-xs', pilotAction.action === 'start' ? 'bg-cream text-void hover:bg-cream/90' : 'bg-red-600 hover:bg-red-700 text-white')}
              >
                {pilotLoading ? 'Processing...' : pilotAction.action === 'start' ? 'Confirm Pilot Start' : 'Confirm Pilot Pause'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
