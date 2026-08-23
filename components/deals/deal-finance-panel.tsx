'use client'

import React, { useState } from 'react'
import { FinanceProposalRecord, FinanceStatus } from '@/lib/services/deal-calc'
import { toast } from 'sonner'
import { Landmark, Plus, ShieldCheck, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

interface DealFinancePanelProps {
  dealId: string
  financeProposals?: FinanceProposalRecord[]
  dealAgreedPrice?: number
  dealDeposit?: number
  dealPXEquity?: number
  onRefresh?: () => void
}

const FINANCE_STATUSES: { id: FinanceStatus; label: string }[] = [
  { id: 'discussion', label: 'Discussion / Preliminary' },
  { id: 'quote_requested', label: 'Quote Requested' },
  { id: 'quote_received', label: 'Quote Received' },
  { id: 'application_pending', label: 'Application Pending' },
  { id: 'submitted', label: 'Submitted to Lender' },
  { id: 'approved', label: 'Approved by Lender' },
  { id: 'declined', label: 'Declined' },
  { id: 'documents_required', label: 'Documents Required' },
  { id: 'activated', label: 'Activated / Paid Out' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function DealFinancePanel({
  dealId,
  financeProposals = [],
  dealAgreedPrice = 0,
  dealDeposit = 0,
  dealPXEquity = 0,
  onRefresh,
}: DealFinancePanelProps) {
  const [showAddForm, setShowAddForm] = useState(financeProposals.length === 0)
  const [provider, setProvider] = useState('')
  const [productType, setProductType] = useState<'hp' | 'pcp' | 'bch' | 'personal_loan' | 'other'>('hp')
  const [vehiclePrice, setVehiclePrice] = useState<number | ''>(dealAgreedPrice || '')
  const [deposit, setDeposit] = useState<number | ''>(dealDeposit || '')
  const [pxEquity, setPxEquity] = useState<number | ''>(dealPXEquity || '')
  const [amountToFinance, setAmountToFinance] = useState<number | ''>(
    Math.max(0, dealAgreedPrice - dealDeposit - dealPXEquity) || ''
  )
  const [termMonths, setTermMonths] = useState<number | ''>(48)
  const [annualMileage, setAnnualMileage] = useState<number | ''>(10000)
  const [apr, setApr] = useState<number | ''>(9.9)
  const [monthlyPayment, setMonthlyPayment] = useState<number | ''>('')
  const [finalPayment, setFinalPayment] = useState<number | ''>('')
  const [externalRef, setExternalRef] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          product_type: productType,
          vehicle_price: Number(vehiclePrice) || 0,
          deposit: Number(deposit) || 0,
          px_equity: Number(pxEquity) || 0,
          amount_to_finance: Number(amountToFinance) || 0,
          term_months: Number(termMonths) || undefined,
          annual_mileage: Number(annualMileage) || undefined,
          apr: apr !== '' ? Number(apr) / 100 : undefined,
          monthly_payment: Number(monthlyPayment) || undefined,
          final_payment: Number(finalPayment) || undefined,
          external_reference: externalRef,
          notes,
        }),
      })

      if (!res.ok) throw new Error('Failed to create finance record')
      toast.success('Finance proposal recorded')
      setShowAddForm(false)
      if (onRefresh) onRefresh()
    } catch {
      toast.error('Failed to create finance proposal')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (proposalId: string, status: FinanceStatus) => {
    try {
      const res = await fetch(`/api/deals/${dealId}/finance/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Finance status updated to ${status.replace('_', ' ')}`)
      if (onRefresh) onRefresh()
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6 text-cream">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-syne font-bold text-base uppercase tracking-wide">Finance Proposals & Applications</h2>
            <span className="px-2 py-0.5 rounded-[2px] font-mono text-[9px] uppercase bg-asphalt border border-steel text-pewter">
              MANUALLY RECORDED
            </span>
          </div>
          <p className="text-xs text-pewter">
            Record finance terms and track application status. No AI credit decisions.
          </p>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="bg-blue hover:bg-blue/90 text-cream px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus size={14} /> Record Finance Proposal
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateProposal} className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-steel/60">
            <h3 className="font-syne font-bold text-sm uppercase text-cream">Record Finance Terms</h3>
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
              <label className="block text-pewter font-mono text-[11px] mb-1">Lender / Finance Provider</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. MotoNovo, Black Horse, Close Brothers"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              >
                <option value="hp">Hire Purchase (HP)</option>
                <option value="pcp">Personal Contract Purchase (PCP)</option>
                <option value="bch">Business Contract Hire (BCH)</option>
                <option value="personal_loan">Personal Loan</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">External Application Ref</label>
              <input
                type="text"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="e.g. APP-88231"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Vehicle Price (£)</label>
              <input
                type="number"
                value={vehiclePrice}
                onChange={(e) => setVehiclePrice(parseFloat(e.target.value) || '')}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Customer Deposit (£)</label>
              <input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(parseFloat(e.target.value) || '')}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Part Exchange Equity (£)</label>
              <input
                type="number"
                value={pxEquity}
                onChange={(e) => setPxEquity(parseFloat(e.target.value) || '')}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Amount to Finance (£) *</label>
              <input
                type="number"
                required
                value={amountToFinance}
                onChange={(e) => setAmountToFinance(parseFloat(e.target.value) || '')}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono font-bold text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Term (Months)</label>
              <input
                type="number"
                value={termMonths}
                onChange={(e) => setTermMonths(parseInt(e.target.value) || '')}
                placeholder="48"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Annual Mileage (for PCP)</label>
              <input
                type="number"
                value={annualMileage}
                onChange={(e) => setAnnualMileage(parseInt(e.target.value) || '')}
                placeholder="10000"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Representative APR (%)</label>
              <input
                type="number"
                step="0.1"
                value={apr}
                onChange={(e) => setApr(parseFloat(e.target.value) || '')}
                placeholder="9.9"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Monthly Payment (£)</label>
              <input
                type="number"
                step="0.01"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(parseFloat(e.target.value) || '')}
                placeholder="0.00"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono font-bold text-blue outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Final Balloon Payment (£)</label>
              <input
                type="number"
                step="0.01"
                value={finalPayment}
                onChange={(e) => setFinalPayment(parseFloat(e.target.value) || '')}
                placeholder="0.00"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>
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
              Save Finance Terms
            </button>
          </div>
        </form>
      )}

      {/* Proposals List */}
      <div className="space-y-4">
        {financeProposals.length === 0 ? (
          <div className="bg-carbon border border-steel p-8 text-center text-pewter text-xs rounded-[2px]">
            No finance proposal records for this deal.
          </div>
        ) : (
          financeProposals.map((fp) => (
            <div key={fp.id} className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-steel/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-asphalt border border-steel rounded-[2px] text-blue">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-syne font-bold text-base text-cream">
                        {fp.provider || 'Finance Provider'} · {fp.product_type.toUpperCase()}
                      </span>
                      {fp.external_reference && (
                        <span className="font-mono text-pewter text-xs">Ref: {fp.external_reference}</span>
                      )}
                    </div>
                    <p className="text-pewter font-mono text-[11px] mt-0.5">
                      Recorded on {new Date(fp.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-pewter text-xs">Status:</span>
                  <select
                    value={fp.status}
                    onChange={(e) => handleUpdateStatus(fp.id, e.target.value as FinanceStatus)}
                    className="bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream text-xs font-medium outline-none focus:border-blue"
                  >
                    {FINANCE_STATUSES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Terms readout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-asphalt p-3 rounded-[2px] border border-steel/40">
                <div>
                  <span className="text-[10px] text-pewter font-mono uppercase block">Amount Financed</span>
                  <span className="font-mono font-bold text-cream text-sm">
                    £{Number(fp.amount_to_finance || 0).toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-pewter font-mono uppercase block">Monthly Payment</span>
                  <span className="font-mono font-bold text-blue text-sm">
                    {fp.monthly_payment ? `£${Number(fp.monthly_payment).toFixed(2)} / mo` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-pewter font-mono uppercase block">Term / APR</span>
                  <span className="font-mono text-cream">
                    {fp.term_months ? `${fp.term_months} mos` : '—'} · {fp.apr ? `${(fp.apr * 100).toFixed(1)}% APR` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-pewter font-mono uppercase block">Final Payment</span>
                  <span className="font-mono text-cream">
                    {fp.final_payment ? `£${Number(fp.final_payment).toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
