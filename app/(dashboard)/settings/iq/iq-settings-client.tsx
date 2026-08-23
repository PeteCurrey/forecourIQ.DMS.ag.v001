'use client'

import { useState } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Check, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Save, 
  Sliders,
  ToggleLeft,
  ToggleRight
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
    <div className="max-w-[1280px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-blue uppercase tracking-widest bg-blue/10 px-2 py-0.5 rounded-[2px] font-semibold">
              System Policy
            </span>
            <span className="font-inter text-xs text-pewter">Governance & Guardrails</span>
          </div>
          <h1 className="font-syne font-semibold text-2xl text-cream tracking-tight">
            IQ Operating Policy & Strategy
          </h1>
        </div>

        <button
          onClick={() => handleSave(settings)}
          disabled={isSaving || !canManage}
          className="flex items-center gap-2 px-4 py-2 bg-blue hover:bg-blue-dim text-void rounded-[2px] font-inter font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {/* Circuit Breaker Banner */}
      <div className={`p-5 rounded-[2px] border transition-all ${
        settings.automation_paused 
          ? 'bg-rose-950/30 border-rose-500/50' 
          : 'bg-carbon/90 border-steel/80 card-hover'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className={settings.automation_paused ? 'text-rose-400' : 'text-amber-400'} />
              <h2 className="font-syne font-semibold text-base text-cream">
                Emergency Circuit Breaker
              </h2>
            </div>
            <p className="font-inter text-xs text-silver max-w-2xl">
              Immediately halts all background AI actions from executing automatically. Core DMS operations, manual approvals, and Ask IQ remain 100% active.
            </p>
          </div>

          <button
            onClick={handleCircuitBreakerToggle}
            disabled={!canManage}
            className={`px-4 py-2 font-inter font-semibold text-xs rounded-[2px] transition-colors cursor-pointer ${
              settings.automation_paused 
                ? 'bg-rose-600 text-white hover:bg-rose-700' 
                : 'bg-asphalt border border-steel text-cream hover:border-amber-400'
            }`}
          >
            {settings.automation_paused ? 'PAUSED — Click to Resume' : 'PAUSE AUTOMATED ACTIONS'}
          </button>
        </div>
      </div>

      {/* Operating Mode Selector */}
      <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-6 space-y-4 card-hover font-inter text-[13px]">
        <div className="space-y-1 border-b border-steel/60 pb-3">
          <h2 className="font-syne font-semibold text-base text-cream">Default AI Operating Mode</h2>
          <p className="text-xs text-pewter">Controls how autonomously IQ proposes and prepares operational actions</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              mode: 'suggest',
              title: 'SUGGEST ONLY',
              desc: 'IQ provides advice and observations only. No actions are drafted or executed.',
            },
            {
              mode: 'assist',
              title: 'ASSIST (Recommended)',
              desc: 'IQ prepares drafted actions (tasks, price changes, appointments). Explicit human approval required before execution.',
            },
            {
              mode: 'controlled_automation',
              title: 'CONTROLLED AUTOMATION',
              desc: 'Permits pre-approved low-risk actions (e.g. SLA follow-up tasks) to execute automatically within configured thresholds.',
            },
          ].map((item) => (
            <button
              key={item.mode}
              onClick={() => handleSave({ default_action_mode: item.mode as IQActionMode })}
              disabled={!canManage}
              className={`p-4 rounded-[2px] border text-left transition-all cursor-pointer ${
                settings.default_action_mode === item.mode
                  ? 'border-blue ring-1 ring-blue bg-blue/5 text-cream'
                  : 'border-steel bg-asphalt/60 hover:border-slate text-silver'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-syne font-semibold text-xs text-cream tracking-wide">{item.title}</span>
                {settings.default_action_mode === item.mode && <Check size={14} className="text-blue" />}
              </div>
              <p className="text-[12px] text-pewter leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Action Policies Table */}
      <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-6 space-y-4 card-hover font-inter text-[13px]">
        <div className="space-y-1 border-b border-steel/60 pb-3">
          <h2 className="font-syne font-semibold text-base text-cream">Action Governance Matrix</h2>
          <p className="text-xs text-pewter">Fine-grained automation permissions per action type</p>
        </div>

        <div className="divide-y divide-steel/40">
          {[
            { key: 'lead.create_followup', name: 'Create SLA Follow-up Task', risk: 'Low Risk', mode: settings.action_policies?.['lead.create_followup']?.mode || 'auto' },
            { key: 'task.create', name: 'Create Operational Task', risk: 'Low Risk', mode: settings.action_policies?.['task.create']?.mode || 'auto' },
            { key: 'appointment.create', name: 'Schedule Customer Appointment', risk: 'Medium Risk', mode: settings.action_policies?.['appointment.create']?.mode || 'assist' },
            { key: 'pricing.prepare_change', name: 'Prepare Pricing Review Signal', risk: 'Medium Risk', mode: settings.action_policies?.['pricing.prepare_change']?.mode || 'assist' },
            { key: 'vehicle.price_change', name: 'Change Vehicle Retail Asking Price', risk: 'High Commercial Risk', mode: 'approval_required', locked: true },
          ].map((item) => (
            <div key={item.key} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-cream">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-pewter uppercase">{item.key}</span>
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-[2px] ${
                    item.risk.includes('High') ? 'bg-rose-500/10 text-rose-400' : 'bg-blue/10 text-blue'
                  }`}>
                    {item.risk}
                  </span>
                </div>
              </div>

              <div>
                {item.locked ? (
                  <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-[2px] font-semibold">
                    STRICT APPROVAL REQUIRED
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-[2px] font-semibold uppercase">
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
