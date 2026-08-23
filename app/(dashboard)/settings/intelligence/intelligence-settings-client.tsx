'use client'

import { useState } from 'react'
import { IntelligenceSettings } from '@/lib/types/intelligence'
import {
  Settings,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export default function IntelligenceSettingsClient({
  dealership,
  initialSettings,
  userId,
}: {
  dealership: { name: string }
  initialSettings: IntelligenceSettings
  userId: string
}) {
  const [settings, setSettings] = useState<IntelligenceSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedSuccess(false)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/intelligence/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_gross_amount: Number(settings.target_gross_amount),
          minimum_gross_amount: Number(settings.minimum_gross_amount),
          target_gross_pct: Number(settings.target_gross_pct),
          max_stock_age_days: Number(settings.max_stock_age_days),
          urgent_stock_age_days: Number(settings.urgent_stock_age_days),
          default_geo_radius_miles: Number(settings.default_geo_radius_miles),
          auto_price_approval_max_reduction: Number(settings.auto_price_approval_max_reduction),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update intelligence settings')
      }

      const updated = await res.json()
      setSettings(updated)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1200px] mx-auto w-full pb-20 space-y-6">
      {/* Header */}
      <div className="border-b border-steel pb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-syne font-bold text-[28px] text-cream">Intelligence Strategy Profile</h1>
          <span className="bg-blue/10 text-blue border border-blue/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-[2px]">
            COMMERCIAL PARAMETERS
          </span>
        </div>
        <p className="font-inter text-[14px] text-pewter">
          Configure commercial targets, ageing thresholds, and automated review boundaries for {dealership.name}.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[2px] flex items-center gap-2 text-emerald-400 font-inter text-[13px]">
          <CheckCircle2 className="w-4 h-4" />
          Intelligence strategy parameters successfully updated.
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-[2px] flex items-center gap-2 text-rose-400 font-inter text-[13px]">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 font-inter text-[13px]">
        {/* Buying Strategy Section */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6 space-y-6">
          <div className="border-b border-steel pb-3">
            <h2 className="font-syne font-bold text-[18px] text-cream">Acquisition & Gross Margin Targets</h2>
            <p className="font-inter text-[12px] text-pewter">
              Used to calculate target and maximum buy prices on buying signals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-pewter font-mono text-[11px] uppercase">
                Target Gross Margin (£)
              </label>
              <input
                type="number"
                value={settings.target_gross_amount}
                onChange={(e) =>
                  setSettings({ ...settings, target_gross_amount: Number(e.target.value) })
                }
                className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono font-bold text-[16px] focus:outline-none focus:border-blue"
              />
              <p className="text-pewter text-[11px]">Default target gross per unit</p>
            </div>

            <div className="space-y-2">
              <label className="text-pewter font-mono text-[11px] uppercase">
                Floor Gross Margin (£)
              </label>
              <input
                type="number"
                value={settings.minimum_gross_amount}
                onChange={(e) =>
                  setSettings({ ...settings, minimum_gross_amount: Number(e.target.value) })
                }
                className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono font-bold text-[16px] focus:outline-none focus:border-blue"
              />
              <p className="text-pewter text-[11px]">Minimum acceptable gross to calculate Max Buy Price</p>
            </div>

            <div className="space-y-2">
              <label className="text-pewter font-mono text-[11px] uppercase">
                Target Gross Percentage (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.target_gross_pct}
                onChange={(e) =>
                  setSettings({ ...settings, target_gross_pct: Number(e.target.value) })
                }
                className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono font-bold text-[16px] focus:outline-none focus:border-blue"
              />
              <p className="text-pewter text-[11px]">Benchmark return on capital</p>
            </div>
          </div>
        </div>

        {/* Pricing & Stock Ageing Thresholds */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6 space-y-6">
          <div className="border-b border-steel pb-3">
            <h2 className="font-syne font-bold text-[18px] text-cream">Stock Ageing & Pricing Review Thresholds</h2>
            <p className="font-inter text-[12px] text-pewter">
              Triggers automated Pricing Attention signals when vehicles cross operational day limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-pewter font-mono text-[11px] uppercase">
                Standard Review Threshold (Days)
              </label>
              <input
                type="number"
                value={settings.max_stock_age_days}
                onChange={(e) =>
                  setSettings({ ...settings, max_stock_age_days: Number(e.target.value) })
                }
                className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono font-bold text-[16px] focus:outline-none focus:border-blue"
              />
              <p className="text-pewter text-[11px]">Triggers high priority pricing signal</p>
            </div>

            <div className="space-y-2">
              <label className="text-pewter font-mono text-[11px] uppercase">
                Urgent Ageing Threshold (Days)
              </label>
              <input
                type="number"
                value={settings.urgent_stock_age_days}
                onChange={(e) =>
                  setSettings({ ...settings, urgent_stock_age_days: Number(e.target.value) })
                }
                className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono font-bold text-[16px] focus:outline-none focus:border-blue"
              />
              <p className="text-pewter text-[11px]">Triggers critical priority capital exposure risk</p>
            </div>

            <div className="space-y-2">
              <label className="text-pewter font-mono text-[11px] uppercase">
                Auto-Price Approval Limit (£)
              </label>
              <input
                type="number"
                value={settings.auto_price_approval_max_reduction}
                onChange={(e) =>
                  setSettings({ ...settings, auto_price_approval_max_reduction: Number(e.target.value) })
                }
                className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono font-bold text-[16px] focus:outline-none focus:border-blue"
              />
              <p className="text-pewter text-[11px]">Max reduction permitted without manager override</p>
            </div>
          </div>
        </div>

        {/* Geographic Context */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6 space-y-6">
          <div className="border-b border-steel pb-3">
            <h2 className="font-syne font-bold text-[18px] text-cream">Market & Geographic Radius</h2>
            <p className="font-inter text-[12px] text-pewter">
              Default geographic radius for market supply and competitor context.
            </p>
          </div>

          <div className="max-w-xs space-y-2">
            <label className="text-pewter font-mono text-[11px] uppercase">
              Default Radius (Miles)
            </label>
            <select
              value={settings.default_geo_radius_miles}
              onChange={(e) =>
                setSettings({ ...settings, default_geo_radius_miles: Number(e.target.value) })
              }
              className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-mono text-[14px] focus:outline-none focus:border-blue"
            >
              <option value="25">25 Miles (Local Area)</option>
              <option value="50">50 Miles (Regional Hub)</option>
              <option value="100">100 Miles (Extended Region)</option>
              <option value="500">National (All UK)</option>
            </select>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-steel">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue text-white text-[13px] font-mono uppercase tracking-wider rounded-[2px] hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Strategy Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
