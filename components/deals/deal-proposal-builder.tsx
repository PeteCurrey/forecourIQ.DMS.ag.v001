'use client'

import React, { useState } from 'react'
import { DealRecord, calcAgreedPrice, calcCustomerPurchaseTotal, calcPXEquity, calcBalanceToFund } from '@/lib/services/deal-calc'
import { DealCalculator } from '@/components/deals/deal-calculator'
import { toast } from 'sonner'
import { FileText, Send, CheckCircle2, History, Plus } from 'lucide-react'

interface DealProposalBuilderProps {
  deal: DealRecord
  proposals?: any[]
  onProposalCreated?: () => void
}

export function DealProposalBuilder({
  deal,
  proposals = [],
  onProposalCreated,
}: DealProposalBuilderProps) {
  const [showBuilder, setShowBuilder] = useState(proposals.length === 0)
  const [retailPrice, setRetailPrice] = useState(deal.vehicle_retail_price || 0)
  const [discount, setDiscount] = useState(deal.discount_amount || 0)
  const [pxAllowance, setPxAllowance] = useState(deal.part_exchange_total || 0)
  const [pxSettlement, setPxSettlement] = useState(deal.part_exchange_settlement || 0)
  const [deposit, setDeposit] = useState(deal.deposit_required || 0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveProposal = async (status: 'draft' | 'presented') => {
    setSaving(true)
    try {
      const agreedPrice = calcAgreedPrice(retailPrice, discount)
      const purchaseTotal = calcCustomerPurchaseTotal(agreedPrice, deal.line_items || [])
      const pxEquity = calcPXEquity(pxAllowance, pxSettlement)
      const balanceToFund = calcBalanceToFund(purchaseTotal, pxEquity, deposit)

      const res = await fetch(`/api/deals/${deal.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          vehicle_retail_price: retailPrice,
          vehicle_selling_price: agreedPrice,
          discount_amount: discount,
          products_total: deal.products_total || 0,
          customer_purchase_total: purchaseTotal,
          px_allowance: pxAllowance,
          px_settlement: pxSettlement,
          px_equity: pxEquity,
          deposit,
          finance_amount: deal.finance_amount || 0,
          balance_to_fund: balanceToFund,
          notes,
        }),
      })

      if (!res.ok) throw new Error('Failed to create proposal')
      toast.success(status === 'presented' ? 'Proposal presented to customer' : 'Proposal draft saved')
      setShowBuilder(false)
      if (onProposalCreated) onProposalCreated()
    } catch {
      toast.error('Failed to create proposal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 text-cream">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne font-bold text-base uppercase tracking-wide">Deal Proposals & Quotes</h2>
          <p className="text-xs text-pewter">Create, version, and present deal structures to customers.</p>
        </div>

        {!showBuilder && (
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="bg-blue hover:bg-blue/90 text-cream px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus size={14} /> New Proposal Version
          </button>
        )}
      </div>

      {/* Builder Modal / Accordion */}
      {showBuilder && (
        <div className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-steel/60">
            <h3 className="font-syne font-bold text-sm uppercase text-cream">Structure Proposal</h3>
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="text-pewter hover:text-silver text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Vehicle Retail Price (£)</label>
              <input
                type="number"
                value={retailPrice || ''}
                onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Agreed Discount (£)</label>
              <input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Part Exchange Allowance (£)</label>
              <input
                type="number"
                value={pxAllowance || ''}
                onChange={(e) => setPxAllowance(parseFloat(e.target.value) || 0)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Part Exchange Settlement (£)</label>
              <input
                type="number"
                value={pxSettlement || ''}
                onChange={(e) => setPxSettlement(parseFloat(e.target.value) || 0)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Required Deposit (£)</label>
              <input
                type="number"
                value={deposit || ''}
                onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Proposal Notes / Terms</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Valid until Saturday, includes 12m warranty"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-steel/60">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveProposal('draft')}
              className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-4 py-1.5 rounded-[2px] text-xs font-medium transition"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveProposal('presented')}
              className="bg-blue hover:bg-blue/90 text-cream px-4 py-1.5 rounded-[2px] text-xs font-medium transition flex items-center gap-1.5"
            >
              <Send size={13} /> Present to Customer
            </button>
          </div>
        </div>
      )}

      {/* Proposals History List */}
      <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
        <div className="p-4 border-b border-steel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={15} className="text-blue" />
            <h3 className="font-syne font-bold text-xs uppercase tracking-wide">Version History</h3>
          </div>
          <span className="text-[11px] font-mono text-pewter">{proposals.length} versions generated</span>
        </div>

        {proposals.length === 0 ? (
          <div className="p-8 text-center text-pewter text-xs">
            No proposals generated yet. Click &quot;New Proposal Version&quot; to build one.
          </div>
        ) : (
          <div className="divide-y divide-steel/40">
            {proposals.map((prop) => (
              <div key={prop.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs hover:bg-asphalt/40 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cream text-sm">Version {prop.version}</span>
                    <span className="px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase bg-asphalt border border-steel text-silver">
                      {prop.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-pewter mt-0.5">
                    Created {new Date(prop.created_at).toLocaleString('en-GB')} by {prop.created_by?.full_name || 'Staff'}
                  </p>
                  {prop.notes && <p className="text-silver italic text-[11px] mt-1">&quot;{prop.notes}&quot;</p>}
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">Selling Price</span>
                    <span className="font-mono font-bold text-cream">£{Number(prop.vehicle_selling_price || 0).toFixed(2)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">PX Equity</span>
                    <span className="font-mono text-cream">£{Number(prop.px_equity || 0).toFixed(2)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-pewter font-mono uppercase block">Balance to Fund</span>
                    <span className="font-mono font-bold text-blue">£{Number(prop.balance_to_fund || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
