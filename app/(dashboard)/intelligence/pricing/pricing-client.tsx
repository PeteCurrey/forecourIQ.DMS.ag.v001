'use client'

import { useState } from 'react'
import { PricingSignal } from '@/lib/types/intelligence'
import { formatCurrency } from '@/lib/format'
import {
  Tag,
  AlertTriangle,
  Eye,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'

export default function PricingClient({
  dealership,
  initialSignals,
  userId,
}: {
  dealership: { name: string; city?: string; county?: string }
  initialSignals: PricingSignal[]
  userId: string
}) {
  const [signals, setSignals] = useState<PricingSignal[]>(initialSignals)
  const [selectedSignal, setSelectedSignal] = useState<PricingSignal | null>(null)
  const [customPrice, setCustomPrice] = useState<string>('')
  const [isApplying, setIsApplying] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  const activeSignals = signals.filter((s) => s.status === 'active')
  const filteredSignals =
    filterType === 'all'
      ? activeSignals
      : activeSignals.filter((s) => s.signal_type === filterType)

  const handleOpenApplyModal = (sig: PricingSignal) => {
    setSelectedSignal(sig)
    setCustomPrice(String(sig.recommended_price || sig.current_price))
  }

  const handleConfirmPriceChange = async () => {
    if (!selectedSignal || !customPrice) return

    setIsApplying(true)
    try {
      const res = await fetch(`/api/intelligence/pricing/${selectedSignal.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_price: Number(customPrice) }),
      })

      if (res.ok) {
        setSignals((prev) =>
          prev.map((s) =>
            s.id === selectedSignal.id ? { ...s, status: 'applied', current_price: Number(customPrice) } : s
          )
        )
        setSelectedSignal(null)
      }
    } catch (err) {
      console.error('Failed to apply pricing change', err)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/intelligence/pricing/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed_reason: 'Price maintained on commercial discretion' }),
      })
      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'dismissed' } : s))
      )
    } catch (err) {
      console.error('Failed to dismiss pricing signal', err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1600px] mx-auto w-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-syne font-bold text-[28px] text-cream">Pricing Attention</h1>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-[2px]">
              HUMAN APPROVAL REQUIRED
            </span>
          </div>
          <p className="font-inter text-[14px] text-pewter">
            Evidence-backed pricing recommendations for vehicles with high engagement gaps or ageing capital exposure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'high_views_low_leads', 'ageing_stock', 'high_demand_hold'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase rounded-[2px] border transition-colors ${
                filterType === type
                  ? 'bg-blue text-white border-blue font-bold'
                  : 'bg-carbon text-pewter border-steel hover:text-cream'
              }`}
            >
              {type === 'all'
                ? 'All Signals'
                : type === 'high_views_low_leads'
                ? 'High Views / Low Leads'
                : type === 'ageing_stock'
                ? 'Ageing Stock'
                : 'Hold Price'}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Attention Grid */}
      {filteredSignals.length === 0 ? (
        <div className="p-12 bg-carbon border border-steel rounded-[2px] text-center space-y-3">
          <Tag className="w-8 h-8 text-pewter mx-auto" />
          <p className="font-syne font-bold text-cream text-[16px]">No Vehicles Require Pricing Attention</p>
          <p className="font-inter text-pewter text-[13px] max-w-md mx-auto">
            All active stockbook vehicles are priced within acceptable market velocity thresholds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredSignals.map((signal) => {
            const v = signal.vehicle_summary || ({} as any)
            return (
              <div
                key={signal.id}
                className="bg-carbon border border-steel rounded-[2px] p-6 space-y-6 hover:border-steel/80 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-steel/60 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="font-syne font-bold text-[20px] text-cream">
                        {v.make} {v.model} {v.variant}
                      </h2>
                      <span className="font-mono text-[12px] bg-asphalt px-2 py-0.5 border border-steel text-cream rounded-[2px]">
                        {v.registration}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-[2px] font-bold ${
                          signal.priority === 'critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : signal.priority === 'high'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue/10 text-blue border border-blue/20'
                        }`}
                      >
                        {signal.priority.toUpperCase()} PRIORITY · {signal.signal_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="font-inter text-[13px] text-silver">{signal.reason_summary}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenApplyModal(signal)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue hover:bg-blue-600 text-white text-[12px] font-mono uppercase rounded-[2px] transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Apply Price Change
                    </button>
                    <button
                      onClick={() => handleDismiss(signal.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-asphalt border border-steel hover:border-rose-500/30 text-pewter hover:text-rose-300 text-[12px] font-mono uppercase rounded-[2px] transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Price Delta Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-asphalt rounded-[2px] border border-steel/40">
                  <div>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Current Retail Price</p>
                    <p className="font-mono font-bold text-[24px] text-cream">
                      {formatCurrency(signal.current_price)}
                    </p>
                    <p className="font-inter text-[11px] text-pewter">{v.days_in_stock} days on plot</p>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Suggested Review Point</p>
                    <p className="font-mono font-bold text-[24px] text-emerald-400">
                      {formatCurrency(signal.recommended_price || signal.current_price)}
                    </p>
                    <p className="font-inter text-[11px] text-pewter">
                      {signal.recommended_change
                        ? `${signal.recommended_change < 0 ? '-' : '+'}${formatCurrency(Math.abs(signal.recommended_change))} adjustment`
                        : 'Hold current price'}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Confidence & Provenance</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-[2px] border border-emerald-500/20">
                        {signal.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    </div>
                    <p className="font-inter text-[11px] text-pewter mt-1">First-party website telemetry</p>
                  </div>
                </div>

                {/* Structured Evidence Items */}
                <div className="space-y-2">
                  <p className="font-mono text-[11px] text-pewter uppercase tracking-wider">Supporting Evidence</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {signal.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-asphalt/70 border border-steel/50 rounded-[2px] font-inter text-[12px] space-y-0.5"
                      >
                        <p className="text-pewter font-mono text-[10px] uppercase">{ev.label}</p>
                        <p className="text-cream font-semibold">{ev.value}</p>
                        <p className="text-pewter text-[10px] font-mono">Source: {ev.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Human Approval Price Adjustment Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-[2px] max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-steel pb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue" />
                <h3 className="font-syne font-bold text-[18px] text-cream">Confirm Price Adjustment</h3>
              </div>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-pewter hover:text-cream font-mono text-[14px]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-inter text-[13px]">
              <div className="p-3 bg-asphalt rounded-[2px] border border-steel/60 space-y-1">
                <p className="font-semibold text-cream">
                  {selectedSignal.vehicle_summary?.make} {selectedSignal.vehicle_summary?.model} ({selectedSignal.vehicle_summary?.registration})
                </p>
                <p className="text-pewter text-[12px]">{selectedSignal.reason_summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-asphalt rounded-[2px] border border-steel/40">
                  <p className="text-pewter font-mono text-[10px] uppercase">Current Asking Price</p>
                  <p className="text-cream font-mono font-bold text-[18px]">
                    {formatCurrency(selectedSignal.current_price)}
                  </p>
                </div>

                <div className="p-3 bg-asphalt rounded-[2px] border border-steel/40">
                  <p className="text-pewter font-mono text-[10px] uppercase">New Asking Price (£)</p>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-carbon border border-steel rounded-[2px] px-2 py-1 text-emerald-400 font-mono font-bold text-[18px] focus:outline-none focus:border-blue"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue/10 border border-blue/20 rounded-[2px] text-silver text-[12px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue shrink-0 mt-0.5" />
                <p>
                  Applying this adjustment will immediately update your stockbook, record a price history entry, update your dealer website, and queue price updates to AutoTrader and configured advertising portals.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-steel">
              <button
                type="button"
                onClick={() => setSelectedSignal(null)}
                className="px-4 py-2 bg-asphalt border border-steel text-cream text-[12px] font-mono uppercase rounded-[2px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApplying}
                onClick={handleConfirmPriceChange}
                className="px-4 py-2 bg-blue text-white text-[12px] font-mono uppercase rounded-[2px] hover:bg-blue-600 disabled:opacity-50"
              >
                {isApplying ? 'Applying...' : 'Approve & Publish Price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
