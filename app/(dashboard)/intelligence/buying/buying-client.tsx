'use client'

import { useState } from 'react'
import {
  BuyingSignal,
  BuyingWatchlistItem,
  IntelligenceSettings,
} from '@/lib/types/intelligence'
import { formatCurrency } from '@/lib/format'
import {
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Bookmark,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Info,
  Calendar,
  AlertCircle,
  Layers,
  ArrowUpRight,
} from 'lucide-react'

export default function BuyingClient({
  dealership,
  initialSignals,
  initialWatchlist,
  settings,
  userId,
}: {
  dealership: { name: string; city?: string; county?: string }
  initialSignals: BuyingSignal[]
  initialWatchlist: BuyingWatchlistItem[]
  settings: IntelligenceSettings
  userId: string
}) {
  const [signals, setSignals] = useState<BuyingSignal[]>(initialSignals)
  const [watchlist, setWatchlist] = useState<BuyingWatchlistItem[]>(initialWatchlist)
  const [activeTab, setActiveTab] = useState<'opportunities' | 'watchlist'>('opportunities')
  const [selectedSignalForExplain, setSelectedSignalForExplain] = useState<BuyingSignal | null>(null)
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false)
  const [newWatchlist, setNewWatchlist] = useState({
    make: '',
    model: '',
    variant: '',
    target_buy_price: '',
    target_retail_price: '',
    notes: '',
  })
  const [savingWatchlist, setSavingWatchlist] = useState(false)

  const handleAccept = async (id: string) => {
    try {
      await fetch(`/api/intelligence/buying/${id}/accept`, { method: 'POST' })
      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'accepted' } : s))
      )
    } catch (err) {
      console.error('Failed to accept signal', err)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/intelligence/buying/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed_reason: 'Dismissed on commercial discretion' }),
      })
      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'dismissed' } : s))
      )
    } catch (err) {
      console.error('Failed to dismiss signal', err)
    }
  }

  const handleSaveWatchlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWatchlist.make || !newWatchlist.model) return

    setSavingWatchlist(true)
    try {
      const res = await fetch('/api/intelligence/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: newWatchlist.make,
          model: newWatchlist.model,
          variant: newWatchlist.variant || null,
          target_buy_price: newWatchlist.target_buy_price ? Number(newWatchlist.target_buy_price) : null,
          target_retail_price: newWatchlist.target_retail_price ? Number(newWatchlist.target_retail_price) : null,
          notes: newWatchlist.notes || null,
        }),
      })
      if (res.ok) {
        const item = await res.json()
        setWatchlist((prev) => [item, ...prev])
        setIsWatchlistModalOpen(false)
        setNewWatchlist({ make: '', model: '', variant: '', target_buy_price: '', target_retail_price: '', notes: '' })
      }
    } catch (err) {
      console.error('Failed to save watchlist item', err)
    } finally {
      setSavingWatchlist(false)
    }
  }

  const activeSignals = signals.filter((s) => s.status === 'new' || s.status === 'reviewed' || s.status === 'watching')

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1600px] mx-auto w-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-syne font-bold text-[28px] text-cream">Buying Intelligence</h1>
            <span className="bg-blue/10 text-blue border border-blue/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-[2px]">
              DETERMINISTIC COMPOSITE ENGINE
            </span>
          </div>
          <p className="font-inter text-[14px] text-pewter">
            Stock gap analysis, proven historical margin, and target acquisition pricing for {dealership.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWatchlistModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-[2px] font-mono text-[12px] uppercase tracking-wider hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add to Watchlist
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-steel">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-6 py-3 font-mono text-[12px] uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'opportunities'
              ? 'border-blue text-cream font-bold'
              : 'border-transparent text-pewter hover:text-silver'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue" />
          Acquisition Candidates ({activeSignals.length})
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`px-6 py-3 font-mono text-[12px] uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'watchlist'
              ? 'border-blue text-cream font-bold'
              : 'border-transparent text-pewter hover:text-silver'
          }`}
        >
          <Bookmark className="w-4 h-4 text-cyan-400" />
          Active Watchlist ({watchlist.length})
        </button>
      </div>

      {/* Opportunities Tab Content */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          {activeSignals.length === 0 ? (
            <div className="p-12 bg-carbon border border-steel rounded-[2px] text-center space-y-3">
              <ShoppingBag className="w-8 h-8 text-pewter mx-auto" />
              <p className="font-syne font-bold text-cream text-[16px]">No Active Acquisition Signals</p>
              <p className="font-inter text-pewter text-[13px] max-w-md mx-auto">
                Your current stockbook adequately covers recent website search demand and historical sales turnover.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {activeSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="bg-carbon border border-steel rounded-[2px] p-6 space-y-6 hover:border-steel/80 transition-colors"
                >
                  {/* Top Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-steel/60 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="font-syne font-bold text-[22px] text-cream">
                          {signal.make} {signal.model}
                        </h2>
                        {signal.variant && (
                          <span className="text-[14px] text-silver font-inter">
                            {signal.variant}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-[2px] font-bold ${
                            signal.opportunity_rating === 'strong'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue/10 text-blue border border-blue/20'
                          }`}
                        >
                          {signal.opportunity_rating.toUpperCase()} OPPORTUNITY ({signal.demand_score}/100)
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-pewter">
                        Target Profile: {signal.year_min}–{signal.year_max} · {signal.fuel_type || 'Any Fuel'} · Max {signal.mileage_max?.toLocaleString() || '40,000'} miles
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedSignalForExplain(signal)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-asphalt border border-steel hover:border-blue text-pewter hover:text-cream text-[11px] font-mono uppercase rounded-[2px] transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-blue" />
                        Why IQ Flagged This
                      </button>
                      <button
                        onClick={() => handleAccept(signal.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono uppercase rounded-[2px] transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDismiss(signal.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-asphalt border border-steel hover:bg-rose-950/20 hover:border-rose-500/30 text-pewter hover:text-rose-300 text-[11px] font-mono uppercase rounded-[2px] transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Commercial Arithmetic Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-asphalt rounded-[2px] border border-steel/40">
                    <div>
                      <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Target Buy Price</p>
                      <p className="font-mono font-bold text-[20px] text-cream">
                        {formatCurrency(signal.target_buy_price || 0)}
                      </p>
                      <p className="font-inter text-[11px] text-pewter">Delivers target margin</p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Maximum Buy Ceiling</p>
                      <p className="font-mono font-bold text-[20px] text-amber-400">
                        {formatCurrency(signal.maximum_buy_price || 0)}
                      </p>
                      <p className="font-inter text-[11px] text-pewter">Floor gross £{settings.minimum_gross_amount}</p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Expected Retail</p>
                      <p className="font-mono font-bold text-[20px] text-cream">
                        {formatCurrency(signal.estimated_retail_price || 0)}
                      </p>
                      <p className="font-inter text-[11px] text-pewter">After £{signal.estimated_prep_cost || 450} prep</p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Projected Gross</p>
                      <p className="font-mono font-bold text-[20px] text-emerald-400">
                        {formatCurrency(signal.estimated_gross || 0)}
                      </p>
                      <p className="font-inter text-[11px] text-pewter">~{signal.estimated_days_to_sale || 21} days turn</p>
                    </div>
                  </div>

                  {/* Dimension Scores & Structured Evidence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <p className="font-mono text-[11px] text-pewter uppercase tracking-wider">
                        Opportunity Score Breakdown
                      </p>
                      <div className="space-y-2">
                        {Object.entries(signal.dimension_scores).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between font-inter text-[12px]">
                              <span className="text-pewter capitalize">{key.replace('_', ' ')}</span>
                              <span className="font-mono text-cream font-bold">{val}/100</span>
                            </div>
                            <div className="w-full bg-steel/30 h-1.5 rounded-[1px] overflow-hidden">
                              <div
                                className={`h-full ${
                                  val >= 80 ? 'bg-emerald-400' : val >= 60 ? 'bg-blue' : 'bg-amber-400'
                                }`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-mono text-[11px] text-pewter uppercase tracking-wider">
                        Structured Evidence Citations
                      </p>
                      <div className="space-y-2">
                        {signal.evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-asphalt/70 border border-steel/50 rounded-[2px] flex items-start gap-2.5"
                          >
                            <Info className="w-4 h-4 text-blue shrink-0 mt-0.5" />
                            <div className="font-inter text-[12px]">
                              <span className="font-semibold text-cream">{ev.label}: </span>
                              <span className="text-silver">{ev.value} </span>
                              <span className="font-mono text-[10px] text-pewter">[{ev.source}]</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist Tab Content */}
      {activeTab === 'watchlist' && (
        <div className="bg-carbon border border-steel rounded-[2px] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-steel pb-4">
            <div>
              <h2 className="font-syne font-bold text-[18px] text-cream">Dealership Acquisition Targets</h2>
              <p className="font-inter text-[13px] text-pewter">
                Vehicles being actively sourced at auction, trade or private channels.
              </p>
            </div>
            <button
              onClick={() => setIsWatchlistModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue text-white rounded-[2px] font-mono text-[11px] uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" /> Add Target
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="py-12 text-center text-pewter font-inter text-[13px]">
              No active watchlist targets configured. Click "Add Target" above to monitor specific vehicles.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-inter text-[13px]">
                <thead>
                  <tr className="border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                    <th className="py-2.5">Target Vehicle</th>
                    <th className="py-2.5 text-right">Target Buy</th>
                    <th className="py-2.5 text-right">Target Retail</th>
                    <th className="py-2.5">Owner</th>
                    <th className="py-2.5">Notes</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel/40">
                  {watchlist.map((item) => (
                    <tr key={item.id} className="hover:bg-asphalt/50">
                      <td className="py-3 font-semibold text-cream">
                        {item.make} {item.model} {item.variant}
                      </td>
                      <td className="py-3 text-right font-mono text-emerald-400">
                        {item.target_buy_price ? formatCurrency(item.target_buy_price) : '—'}
                      </td>
                      <td className="py-3 text-right font-mono text-cream">
                        {item.target_retail_price ? formatCurrency(item.target_retail_price) : '—'}
                      </td>
                      <td className="py-3 text-pewter">{item.owner_name}</td>
                      <td className="py-3 text-pewter text-[12px]">{item.notes || '—'}</td>
                      <td className="py-3 text-right font-mono text-[11px] text-emerald-400 uppercase">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Explain IQ Modal */}
      {selectedSignalForExplain && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-[2px] max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-steel pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue" />
                <h3 className="font-syne font-bold text-[18px] text-cream">
                  IQ Explanation: {selectedSignalForExplain.make} {selectedSignalForExplain.model}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSignalForExplain(null)}
                className="text-pewter hover:text-cream font-mono text-[14px]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-inter text-[14px] text-silver leading-relaxed">
              <p className="font-semibold text-cream">ForecourIQ flagged this acquisition opportunity because:</p>
              <ul className="space-y-2 list-disc pl-5">
                {selectedSignalForExplain.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>

              <div className="p-4 bg-asphalt rounded-[2px] border border-steel/60 space-y-2">
                <p className="font-mono text-[11px] text-pewter uppercase tracking-wider">CITED EVIDENCE SOURCES</p>
                <div className="space-y-1 font-mono text-[12px] text-cream">
                  {selectedSignalForExplain.evidence.map((ev, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-pewter">{ev.label}:</span>
                      <span>{ev.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[12px] text-pewter italic">
                Data Disclosure: Derived from ForecourIQ first-party dealership stockbook and website telemetry. Regional competitor external feeds are unconfigured.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedSignalForExplain(null)}
                className="px-4 py-2 bg-asphalt border border-steel text-cream text-[12px] font-mono uppercase rounded-[2px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Watchlist Target Modal */}
      {isWatchlistModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-[2px] max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-steel pb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue" />
                <h3 className="font-syne font-bold text-[18px] text-cream">Add Watchlist Acquisition Target</h3>
              </div>
              <button
                onClick={() => setIsWatchlistModalOpen(false)}
                className="text-pewter hover:text-cream font-mono text-[14px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWatchlist} className="space-y-4 font-inter text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-pewter font-mono text-[11px] uppercase">Make *</label>
                  <input
                    type="text"
                    required
                    value={newWatchlist.make}
                    onChange={(e) => setNewWatchlist({ ...newWatchlist, make: e.target.value })}
                    placeholder="e.g. BMW"
                    className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-pewter font-mono text-[11px] uppercase">Model *</label>
                  <input
                    type="text"
                    required
                    value={newWatchlist.model}
                    onChange={(e) => setNewWatchlist({ ...newWatchlist, model: e.target.value })}
                    placeholder="e.g. 3 Series"
                    className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-pewter font-mono text-[11px] uppercase">Variant / Spec</label>
                <input
                  type="text"
                  value={newWatchlist.variant}
                  onChange={(e) => setNewWatchlist({ ...newWatchlist, variant: e.target.value })}
                  placeholder="e.g. 330e M Sport Pro"
                  className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-pewter font-mono text-[11px] uppercase">Target Buy Price (£)</label>
                  <input
                    type="number"
                    value={newWatchlist.target_buy_price}
                    onChange={(e) => setNewWatchlist({ ...newWatchlist, target_buy_price: e.target.value })}
                    placeholder="21500"
                    className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-pewter font-mono text-[11px] uppercase">Target Retail Price (£)</label>
                  <input
                    type="number"
                    value={newWatchlist.target_retail_price}
                    onChange={(e) => setNewWatchlist({ ...newWatchlist, target_retail_price: e.target.value })}
                    placeholder="26995"
                    className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-pewter font-mono text-[11px] uppercase">Notes</label>
                <textarea
                  rows={2}
                  value={newWatchlist.notes}
                  onChange={(e) => setNewWatchlist({ ...newWatchlist, notes: e.target.value })}
                  placeholder="e.g. Prefer Mineral Grey or Black with Pro Pack"
                  className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-steel">
                <button
                  type="button"
                  onClick={() => setIsWatchlistModalOpen(false)}
                  className="px-4 py-2 bg-asphalt border border-steel text-cream text-[12px] font-mono uppercase rounded-[2px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWatchlist}
                  className="px-4 py-2 bg-blue text-white text-[12px] font-mono uppercase rounded-[2px] hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingWatchlist ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
