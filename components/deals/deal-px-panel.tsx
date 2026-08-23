'use client'

import React, { useState } from 'react'
import { PartExchangeRecord, isNegativeEquity, calcPXEquity } from '@/lib/services/deal-calc'
import { toast } from 'sonner'
import { Car, Plus, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react'

interface DealPXPanelProps {
  dealId: string
  partExchanges?: PartExchangeRecord[]
  onRefresh?: () => void
}

export function DealPXPanel({ dealId, partExchanges = [], onRefresh }: DealPXPanelProps) {
  const [showAddForm, setShowAddForm] = useState(partExchanges.length === 0)
  const [reg, setReg] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const [mileage, setMileage] = useState<number | ''>('')
  const [colour, setColour] = useState('')
  const [condition, setCondition] = useState('good')
  const [serviceHistory, setServiceHistory] = useState('full')
  const [allowance, setAllowance] = useState<number | ''>('')
  const [tradeValue, setTradeValue] = useState<number | ''>('')
  const [financeOutstanding, setFinanceOutstanding] = useState(false)
  const [financeProvider, setFinanceProvider] = useState('')
  const [settlementAmount, setSettlementAmount] = useState<number | ''>('')
  const [settlementRef, setSettlementRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [acquiringId, setAcquiringId] = useState<string | null>(null)

  const handleCreatePX = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reg) {
      toast.error('Registration number is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/part-exchanges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration: reg.toUpperCase(),
          make,
          model,
          year: Number(year) || undefined,
          mileage: Number(mileage) || undefined,
          colour,
          condition,
          service_history: serviceHistory,
          allowance: Number(allowance) || 0,
          trade_value: Number(tradeValue) || 0,
          finance_outstanding: financeOutstanding,
          finance_provider: financeOutstanding ? financeProvider : undefined,
          settlement_amount: financeOutstanding ? Number(settlementAmount) || 0 : 0,
          settlement_reference: financeOutstanding ? settlementRef : undefined,
          settlement_status: financeOutstanding ? 'requested' : 'not_applicable',
        }),
      })

      if (!res.ok) throw new Error('Failed to create part exchange')
      toast.success('Part exchange added to deal')
      setShowAddForm(false)
      // reset
      setReg('')
      setMake('')
      setModel('')
      setAllowance('')
      setSettlementAmount('')
      if (onRefresh) onRefresh()
    } catch {
      toast.error('Failed to add part exchange')
    } finally {
      setSaving(false)
    }
  }

  const handleAcquireToStock = async (pxId: string) => {
    setAcquiringId(pxId)
    try {
      const res = await fetch(`/api/deals/${dealId}/part-exchanges/${pxId}/acquire`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to acquire to stock')
      toast.success('Part exchange acquired into stock!')
      if (onRefresh) onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to acquire')
    } finally {
      setAcquiringId(null)
    }
  }

  return (
    <div className="space-y-6 text-cream">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne font-bold text-base uppercase tracking-wide">Part Exchange Appraisal & Equity</h2>
          <p className="text-xs text-pewter">Manage trade-in appraisals, settlement figures, and stock acquisitions.</p>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="bg-blue hover:bg-blue/90 text-cream px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus size={14} /> Add Part Exchange
          </button>
        )}
      </div>

      {/* Add PX Form */}
      {showAddForm && (
        <form onSubmit={handleCreatePX} className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-steel/60">
            <h3 className="font-syne font-bold text-sm uppercase text-cream">Appraise Part Exchange</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-pewter hover:text-silver text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Registration *</label>
              <input
                type="text"
                required
                value={reg}
                onChange={(e) => setReg(e.target.value.toUpperCase())}
                placeholder="e.g. AB18 CDE"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono font-bold text-cream uppercase outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Make</label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Volkswagen"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Golf GTD"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || '')}
                placeholder="2018"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Mileage</label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(parseInt(e.target.value) || '')}
                placeholder="45000"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Colour</label>
              <input
                type="text"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                placeholder="Grey"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Service History</label>
              <select
                value={serviceHistory}
                onChange={(e) => setServiceHistory(e.target.value)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              >
                <option value="full">Full Service History</option>
                <option value="partial">Partial History</option>
                <option value="none">No History</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Trade Valuation (£)</label>
              <input
                type="number"
                value={tradeValue}
                onChange={(e) => setTradeValue(parseFloat(e.target.value) || '')}
                placeholder="0.00"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>
          </div>

          <div className="p-3 bg-asphalt/60 border border-steel rounded-[2px] space-y-3">
            <h4 className="font-syne font-bold text-xs uppercase text-cream">Allowance & Settlement</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-pewter font-mono text-[11px] mb-1">Offered Allowance (£) *</label>
                <input
                  type="number"
                  value={allowance}
                  onChange={(e) => setAllowance(parseFloat(e.target.value) || '')}
                  placeholder="0.00"
                  className="w-full bg-carbon border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream font-bold outline-none focus:border-blue"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="fin_out"
                  checked={financeOutstanding}
                  onChange={(e) => setFinanceOutstanding(e.target.checked)}
                  className="rounded border-steel"
                />
                <label htmlFor="fin_out" className="text-silver text-xs cursor-pointer">
                  Vehicle has outstanding finance settlement
                </label>
              </div>
            </div>

            {financeOutstanding && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div>
                  <label className="block text-pewter font-mono text-[11px] mb-1">Finance Provider</label>
                  <input
                    type="text"
                    value={financeProvider}
                    onChange={(e) => setFinanceProvider(e.target.value)}
                    placeholder="e.g. MotoNovo, Black Horse"
                    className="w-full bg-carbon border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="block text-pewter font-mono text-[11px] mb-1">Settlement Amount (£)</label>
                  <input
                    type="number"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(parseFloat(e.target.value) || '')}
                    placeholder="0.00"
                    className="w-full bg-carbon border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="block text-pewter font-mono text-[11px] mb-1">Settlement Reference</label>
                  <input
                    type="text"
                    value={settlementRef}
                    onChange={(e) => setSettlementRef(e.target.value)}
                    placeholder="Ref or Agreement No"
                    className="w-full bg-carbon border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-4 py-1.5 rounded-[2px] text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue hover:bg-blue/90 text-cream px-4 py-1.5 rounded-[2px] text-xs font-medium transition"
            >
              Save Part Exchange
            </button>
          </div>
        </form>
      )}

      {/* Part Exchanges List */}
      <div className="space-y-4">
        {partExchanges.length === 0 ? (
          <div className="bg-carbon border border-steel p-8 text-center text-pewter text-xs rounded-[2px]">
            No part exchanges attached to this deal.
          </div>
        ) : (
          partExchanges.map((px) => {
            const equity = calcPXEquity(px.allowance, px.settlement_amount)
            const hasNegativeEq = isNegativeEquity(equity)

            return (
              <div key={px.id} className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-steel/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-asphalt border border-steel rounded-[2px] text-blue">
                      <Car size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-cream">{px.registration}</span>
                        <span className="text-silver text-sm">
                          {px.make} {px.model} {px.derivative || ''}
                        </span>
                        <span className="px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase bg-asphalt border border-steel text-silver">
                          {px.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-pewter font-mono text-[11px] mt-0.5">
                        {px.year ? `${px.year} · ` : ''}
                        {px.mileage ? `${px.mileage.toLocaleString()} miles · ` : ''}
                        {px.colour ? `${px.colour} · ` : ''}
                        Condition: {px.condition}
                      </p>
                    </div>
                  </div>

                  {px.status !== 'acquired_to_stock' && (
                    <button
                      type="button"
                      disabled={acquiringId === px.id}
                      onClick={() => handleAcquireToStock(px.id)}
                      className="bg-positive/20 hover:bg-positive/30 text-positive border border-positive/40 px-3 py-1.5 rounded-[2px] text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <Sparkles size={13} /> Acquire into Stockbook
                    </button>
                  )}
                </div>

                {/* Financial Stack */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-asphalt p-3 rounded-[2px] border border-steel/40">
                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">Allowance Offered</span>
                    <span className="font-mono font-bold text-cream text-sm">£{Number(px.allowance || 0).toFixed(2)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">Finance Settlement</span>
                    <span className="font-mono text-cream text-sm">
                      {px.finance_outstanding ? `£${Number(px.settlement_amount || 0).toFixed(2)}` : '£0.00 (Clear)'}
                    </span>
                    {px.finance_outstanding && (
                      <span className="text-[10px] text-pewter block mt-0.5">Provider: {px.finance_provider || '—'}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">Net Equity Value</span>
                    <span className={`font-mono font-bold text-sm ${hasNegativeEq ? 'text-negative' : 'text-positive'}`}>
                      {hasNegativeEq ? `-£${Math.abs(equity).toFixed(2)}` : `£${equity.toFixed(2)}`}
                    </span>
                    {hasNegativeEq && (
                      <div className="flex items-center gap-1 text-[10px] text-negative font-mono mt-0.5">
                        <AlertTriangle size={10} /> NEGATIVE EQUITY
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">Settlement Status</span>
                    <span className="font-mono text-silver text-[11px] uppercase block">
                      {px.settlement_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
