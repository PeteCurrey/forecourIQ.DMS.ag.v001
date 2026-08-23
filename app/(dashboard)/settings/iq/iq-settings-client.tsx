'use client'

import { useState } from 'react';
import { 
  ShieldAlert, 
  Check, 
  Save, 
} from 'lucide-react';
import { toast } from 'sonner';
import { DealershipIQSettings, IQActionMode } from '@/lib/types/iq';

interface IQSettingsClientProps {
  settings: DealershipIQSettings;
  userRole: string;
}

export default function IQSettingsClient({
  settings: initialSettings,
  userRole,
}: IQSettingsClientProps) {
  const [settings, setSettings] = useState<DealershipIQSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = userRole === 'admin' || userRole === 'dealer_principal' || userRole === 'manager';

  const handleSave = async (updatedFields: Partial<DealershipIQSettings>) => {
    if (!canManage) {
      toast.error('Only managers and administrators can adjust IQ operating policy');
      return;
    }

    setIsSaving(true);
    const newSettings = { ...settings, ...updatedFields };
    setSettings(newSettings);

    try {
      const res = await fetch('/api/iq/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      const data = await res.json();
      if (data.data) {
        toast.success('IQ settings and policy updated');
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch {
      toast.error('Network error updating settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCircuitBreakerToggle = async () => {
    const nextPaused = !settings.automation_paused;
    await handleSave({ automation_paused: nextPaused });
    if (nextPaused) {
      toast.warning('EMERGENCY CIRCUIT BREAKER ACTIVATED: All automated actions paused');
    } else {
      toast.success('Automated actions resumed');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel/60 pb-4">
        <div>
          <h1 className="font-syne-title text-2xl text-cream tracking-tight">
            IQ Operating Policy & Strategy
          </h1>
          <p className="font-inter text-xs text-silver mt-0.5">
            Operational automation guardrails, approval thresholds, and circuit breakers
          </p>
        </div>

        <button
          onClick={() => handleSave(settings)}
          disabled={isSaving || !canManage}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue hover:bg-blue-dim text-white rounded-[2px] font-inter font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={13} />
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {/* Circuit Breaker Banner */}
      <div className={`p-4 rounded-[2px] border transition-all ${
        settings.automation_paused 
          ? 'bg-negative/10 border-negative/40 text-negative' 
          : 'bg-carbon border-steel shadow-2xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className={settings.automation_paused ? 'text-negative' : 'text-warning'} />
              <h2 className="font-inter font-semibold text-sm text-cream">
                Emergency Circuit Breaker
              </h2>
            </div>
            <p className="font-inter text-xs text-silver max-w-2xl">
              Immediately halts background automated actions. Manual approvals, stockbook, CRM, and Ask IQ remain fully active.
            </p>
          </div>

          <button
            onClick={handleCircuitBreakerToggle}
            disabled={!canManage}
            className={`px-3.5 py-1.5 font-inter font-medium text-xs rounded-[2px] transition-colors cursor-pointer ${
              settings.automation_paused 
                ? 'bg-negative text-white hover:bg-negative/90' 
                : 'bg-asphalt border border-steel text-cream hover:border-slate'
            }`}
          >
            {settings.automation_paused ? 'PAUSED — Click to Resume' : 'Pause Automated Actions'}
          </button>
        </div>
      </div>

      {/* Operating Mode Selector */}
      <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-3 shadow-2xs font-inter text-xs">
        <div className="border-b border-steel pb-2.5">
          <h2 className="font-inter font-semibold text-sm text-cream">Default AI Operating Mode</h2>
          <p className="text-xs text-pewter">Controls how autonomously IQ proposes and prepares operational actions</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              mode: 'suggest',
              title: 'Suggest Only',
              desc: 'IQ provides advice and observations. No automated background actions executed.',
            },
            {
              mode: 'assist',
              title: 'Assist (Recommended)',
              desc: 'IQ drafts actions (tasks, price changes, appointments). Human approval required.',
            },
            {
              mode: 'controlled_automation',
              title: 'Controlled Automation',
              desc: 'Allows pre-approved low-risk actions (e.g. SLA follow-up tasks) to execute within set limits.',
            },
          ].map((item) => (
            <button
              key={item.mode}
              onClick={() => handleSave({ default_action_mode: item.mode as IQActionMode })}
              disabled={!canManage}
              className={`p-3.5 rounded-[2px] border text-left transition-colors cursor-pointer ${
                settings.default_action_mode === item.mode
                  ? 'border-blue ring-1 ring-blue bg-blue/5 text-cream'
                  : 'border-steel bg-asphalt/40 hover:border-slate text-silver'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-inter font-semibold text-xs text-cream">{item.title}</span>
                {settings.default_action_mode === item.mode && <Check size={13} className="text-blue" />}
              </div>
              <p className="text-[11px] text-pewter leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Action Policies Table */}
      <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-3 shadow-2xs font-inter text-xs">
        <div className="border-b border-steel pb-2.5">
          <h2 className="font-inter font-semibold text-sm text-cream">Action Governance Matrix</h2>
          <p className="text-xs text-pewter">Fine-grained automation permissions per action type</p>
        </div>

        <div className="divide-y divide-steel/60">
          {[
            { key: 'lead.create_followup', name: 'Create SLA Follow-up Task', risk: 'Low Risk', mode: settings.action_policies?.['lead.create_followup']?.mode || 'auto' },
            { key: 'task.create', name: 'Create Operational Task', risk: 'Low Risk', mode: settings.action_policies?.['task.create']?.mode || 'auto' },
            { key: 'appointment.create', name: 'Schedule Customer Appointment', risk: 'Medium Risk', mode: settings.action_policies?.['appointment.create']?.mode || 'assist' },
            { key: 'pricing.prepare_change', name: 'Prepare Pricing Review Signal', risk: 'Medium Risk', mode: settings.action_policies?.['pricing.prepare_change']?.mode || 'assist' },
            { key: 'vehicle.price_change', name: 'Change Vehicle Retail Asking Price', risk: 'High Commercial Risk', mode: 'approval_required', locked: true },
          ].map((item) => (
            <div key={item.key} className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-cream">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[9px] text-pewter uppercase">{item.key}</span>
                  <span className={`font-mono text-[9px] uppercase px-1 py-0.2 rounded-[2px] ${
                    item.risk.includes('High') ? 'bg-negative/10 text-negative' : 'bg-blue/10 text-blue'
                  }`}>
                    {item.risk}
                  </span>
                </div>
              </div>

              <div>
                {item.locked ? (
                  <span className="font-mono text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded-[2px] font-semibold">
                    APPROVAL REQUIRED
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-positive bg-positive/10 px-2 py-0.5 rounded-[2px] font-semibold uppercase">
                    {item.mode}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
