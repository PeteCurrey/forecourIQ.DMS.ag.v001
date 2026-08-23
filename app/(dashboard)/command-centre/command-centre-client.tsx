'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MarketOverviewData,
  BuyingSignal,
  PricingSignal,
  CapitalExposureSummary,
  StockRiskSignal,
} from '@/lib/types/intelligence'
import { formatCurrency } from '@/lib/format'
import {
  Brain,
  Sparkles,
  ShoppingBag,
  Tag,
  AlertTriangle,
  Send,
  HelpCircle,
  TrendingUp,
  Compass,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react'

export default function CommandCentreClient({
  dealership,
  overview,
  buyingSignals,
  pricingSignals,
  capitalExposure,
  stockRiskSignals,
  userId,
}: {
  dealership: { id: string; name: string; city?: string; county?: string }
  overview: MarketOverviewData
  buyingSignals: BuyingSignal[]
  pricingSignals: PricingSignal[]
  capitalExposure: CapitalExposureSummary
  stockRiskSignals: StockRiskSignal[]
  userId: string
}) {
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `Hello. I am ForecourIQ Intelligence. I monitor your stockbook, website visitor demand, and operational sales turn to surface commercial opportunities and pricing reviews. Ask me anything about your current inventory, stock gaps, or historical margins.`,
    },
  ])
  const [isAsking, setIsAsking] = useState(false)

  const activeBuyingCount = buyingSignals.filter((s) => s.status === 'new' || s.status === 'reviewed').length
  const activePricingCount = pricingSignals.filter((s) => s.status === 'active').length

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || isAsking) return

    const question = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: question }])
    setIsAsking(true)

    try {
      const res = await fetch('/api/intelligence/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (res.ok) {
        const data = await res.json()
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.answer || 'No data found.' }])
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Unable to process question at this time.' },
        ])
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error connecting to Intelligence service.' },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setChatInput(prompt)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1600px] mx-auto w-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-syne font-bold text-[28px] text-cream">Commercial Command Centre</h1>
            <span className="bg-blue/10 text-blue border border-blue/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-[2px]">
              GROUNDED EVIDENCE ACTIVE
            </span>
          </div>
          <p className="font-inter text-[14px] text-pewter">
            Integrated morning briefing, stock risk monitoring, buying signals, and Ask IQ for {dealership.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/intelligence/buying"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-asphalt border border-steel hover:border-blue text-pewter hover:text-cream text-[11px] font-mono uppercase rounded-[2px] transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue" />
            Buying Intelligence
          </Link>
          <Link
            href="/intelligence/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-asphalt border border-steel hover:border-amber-400 text-pewter hover:text-cream text-[11px] font-mono uppercase rounded-[2px] transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            Pricing Attention
          </Link>
        </div>
      </div>

      {/* Morning Snapshot KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Buying Opportunities</span>
            <ShoppingBag className="w-4 h-4 text-blue" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-syne font-bold text-[32px] text-cream leading-none">
              {activeBuyingCount}
            </span>
            <span className="font-mono text-[11px] text-emerald-400">Stock Gaps</span>
          </div>
          <Link
            href="/intelligence/buying"
            className="font-inter text-[12px] text-blue hover:underline mt-3 flex items-center gap-1"
          >
            View acquisition candidates <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Pricing Reviews</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-syne font-bold text-[32px] text-cream leading-none">
              {activePricingCount}
            </span>
            <span className="font-mono text-[11px] text-amber-400">Action Required</span>
          </div>
          <Link
            href="/intelligence/pricing"
            className="font-inter text-[12px] text-amber-400 hover:underline mt-3 flex items-center gap-1"
          >
            Review price adjustments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">High Risk Capital (&gt;60d)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-[26px] text-rose-400 leading-none">
              {formatCurrency(capitalExposure.high_risk_capital)}
            </span>
          </div>
          <p className="font-inter text-[12px] text-pewter mt-3">
            {capitalExposure.days_61_to_90.count + capitalExposure.over_90_days.count} vehicles over 60 days on plot
          </p>
        </div>

        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-pewter mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Website Demand Velocity</span>
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-syne font-bold text-[32px] text-cream leading-none">
              {overview.website_demand.demand_index}
            </span>
            <span className="font-mono text-[11px] text-emerald-400">/ 100 Index</span>
          </div>
          <Link
            href="/intelligence/market"
            className="font-inter text-[12px] text-cyan-400 hover:underline mt-3 flex items-center gap-1"
          >
            Explore demand telemetry <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Intelligence Grid: Ask IQ + Opportunity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ask IQ Console */}
        <div className="lg:col-span-2 bg-carbon border border-steel rounded-[2px] flex flex-col h-[580px]">
          <div className="p-4 border-b border-steel flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Brain className="w-5 h-5 text-blue" />
              <div>
                <h2 className="font-syne font-bold text-[16px] text-cream">Ask IQ Commercial Intelligence</h2>
                <p className="font-inter text-[11px] text-pewter">
                  Grounded in live stockbook records, website searches, and historical turn.
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-[2px]">
              GROUNDED
            </span>
          </div>

          {/* Chat Transcript */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-inter text-[13px]">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue/30 flex items-center justify-center text-blue shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-[2px] max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue text-white'
                      : 'bg-asphalt border border-steel/60 text-silver'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue/30 flex items-center justify-center text-blue shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-asphalt border border-steel/60 text-pewter font-mono text-[11px] rounded-[2px]">
                  Analyzing operational evidence...
                </div>
              </div>
            )}
          </div>

          {/* Suggested Prompts */}
          <div className="p-3 bg-asphalt/50 border-t border-steel/40 flex items-center gap-2 overflow-x-auto">
            <span className="font-mono text-[10px] text-pewter uppercase shrink-0">Suggestions:</span>
            {[
              'Which models are customers looking for that we don’t stock?',
              'Where is our capital tied up over 60 days?',
              'Which stock has high views but low conversion?',
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(p)}
                className="px-2.5 py-1 bg-carbon border border-steel hover:border-blue text-pewter hover:text-cream text-[11px] font-inter rounded-[2px] whitespace-nowrap transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-steel flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a commercial or inventory question..."
              className="flex-1 bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream font-inter text-[13px] focus:outline-none focus:border-blue"
            />
            <button
              type="submit"
              disabled={isAsking || !chatInput.trim()}
              className="px-4 py-2 bg-blue text-white rounded-[2px] font-mono text-[12px] uppercase disabled:opacity-50 hover:bg-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Ask IQ
            </button>
          </form>
        </div>

        {/* Priority Opportunity & Risk Feed */}
        <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-steel pb-3">
              <h2 className="font-syne font-bold text-[16px] text-cream">Priority Action Items</h2>
              <span className="font-mono text-[10px] text-pewter">TODAY</span>
            </div>

            {/* Top Buying Signal */}
            {buyingSignals[0] && (
              <div className="p-3.5 bg-asphalt border border-steel/60 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Acquisition Gap
                  </span>
                  <span className="font-mono text-[11px] text-cream font-bold">
                    Target: {formatCurrency(buyingSignals[0].target_buy_price || 0)}
                  </span>
                </div>
                <p className="font-semibold text-cream font-inter text-[13px]">
                  {buyingSignals[0].make} {buyingSignals[0].model} {buyingSignals[0].variant}
                </p>
                <p className="text-pewter text-[12px] font-inter">
                  Zero current stockbook inventory with high website search demand.
                </p>
              </div>
            )}

            {/* Top Pricing Signal */}
            {pricingSignals[0] && (
              <div className="p-3.5 bg-asphalt border border-steel/60 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Pricing Attention
                  </span>
                  <span className="font-mono text-[11px] text-amber-400 font-bold">
                    Suggested: {formatCurrency(pricingSignals[0].recommended_price || 0)}
                  </span>
                </div>
                <p className="font-semibold text-cream font-inter text-[13px]">
                  {pricingSignals[0].vehicle_summary?.make} {pricingSignals[0].vehicle_summary?.model} ({pricingSignals[0].vehicle_summary?.registration})
                </p>
                <p className="text-pewter text-[12px] font-inter line-clamp-2">
                  {pricingSignals[0].reason_summary}
                </p>
              </div>
            )}

            {/* Top Stock Risk Signal */}
            {stockRiskSignals[0] && (
              <div className="p-3.5 bg-asphalt border border-steel/60 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-rose-400 uppercase font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Ageing Capital
                  </span>
                  <span className="font-mono text-[11px] text-rose-400 font-bold">
                    {stockRiskSignals[0].days_in_stock} Days
                  </span>
                </div>
                <p className="font-semibold text-cream font-inter text-[13px]">
                  {stockRiskSignals[0].vehicle_summary?.make} {stockRiskSignals[0].vehicle_summary?.model} ({stockRiskSignals[0].vehicle_summary?.registration})
                </p>
                <p className="text-pewter text-[12px] font-inter">
                  £{stockRiskSignals[0].capital_invested.toLocaleString()} capital exposed on forecourt.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-steel">
            <Link
              href="/intelligence/market"
              className="w-full flex items-center justify-center gap-2 py-2 bg-asphalt border border-steel hover:border-blue text-cream text-[12px] font-mono uppercase rounded-[2px] transition-colors"
            >
              Open Full Intelligence Hub <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
