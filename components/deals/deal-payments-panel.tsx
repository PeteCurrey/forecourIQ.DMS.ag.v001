'use client'

import React, { useState } from 'react'
import { PaymentRecord, PaymentStatus } from '@/lib/services/deal-calc'
import { toast } from 'sonner'
import { CreditCard, Plus, CheckCircle2, AlertCircle, FileText, ArrowUpRight, DollarSign } from 'lucide-react'

interface DealPaymentsPanelProps {
  dealId: string
  payments?: PaymentRecord[]
  depositRequired?: number
  depositPaid?: number
  onRefresh?: () => void
}

export function DealPaymentsPanel({
  dealId,
  payments = [],
  depositRequired = 0,
  depositPaid = 0,
  onRefresh,
}: DealPaymentsPanelProps) {
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [showStripeModal, setShowStripeModal] = useState(false)
  const [category, setCategory] = useState<PaymentRecord['category']>('sales_deposit')
  const [amount, setAmount] = useState<number | ''>(Math.max(0, depositRequired - depositPaid) || '')
  const [method, setMethod] = useState<PaymentRecord['method']>('bank_transfer')
  const [providerRef, setProviderRef] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Valid payment amount required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          amount: Number(amount),
          method,
          provider_reference: providerRef,
          notes,
        }),
      })

      if (!res.ok) throw new Error('Failed to record payment')
      toast.success('Payment recorded to ledger')
      setShowRecordForm(false)
      if (onRefresh) onRefresh()
    } catch {
      toast.error('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateStripeDeposit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Valid deposit amount required')
      return
    }

    setStripeLoading(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/payments/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          category: 'sales_deposit',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create checkout session')

      toast.success('Stripe checkout link generated!')
      window.open(data.url, '_blank')
      setShowStripeModal(false)
      if (onRefresh) onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate Stripe deposit')
    } finally {
      setStripeLoading(false)
    }
  }

  const handleGenerateReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/deals/${dealId}/documents/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error('Failed to generate receipt')

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(data.html)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
      toast.success('Deposit receipt generated')
    } catch {
      toast.error('Failed to generate receipt')
    }
  }

  return (
    <div className="space-y-6 text-cream">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-base uppercase tracking-wide">Deposit & Payment Ledger</h2>
          <p className="text-xs text-pewter">Track received deposits, balance payments, and generate official receipts.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowStripeModal(true)}
            className="bg-blue/20 hover:bg-blue/30 text-blue border border-blue/40 px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition"
          >
            <CreditCard size={14} /> Stripe Deposit Link
          </button>

          <button
            type="button"
            onClick={() => setShowRecordForm(true)}
            className="bg-blue hover:bg-blue/90 text-cream px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus size={14} /> Record Payment
          </button>
        </div>
      </div>

      {/* Stripe Modal */}
      {showStripeModal && (
        <div className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-steel/60">
            <h3 className="font-syne font-bold text-sm uppercase text-cream">Create Stripe Deposit Checkout</h3>
            <button type="button" onClick={() => setShowStripeModal(false)} className="text-pewter hover:text-silver text-xs">
              Cancel
            </button>
          </div>

          <p className="text-xs text-silver">
            Generate a secure, hosted Stripe payment link to email or text to the customer for their holding deposit.
          </p>

          <div className="max-w-xs">
            <label className="block text-pewter font-mono text-[11px] mb-1">Deposit Amount (£)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
              className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowStripeModal(false)}
              className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-4 py-1.5 rounded-[2px] text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={stripeLoading}
              onClick={handleCreateStripeDeposit}
              className="bg-blue hover:bg-blue/90 text-cream px-4 py-1.5 rounded-[2px] text-xs font-medium transition flex items-center gap-1.5"
            >
              <ArrowUpRight size={13} /> Launch Checkout Session
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Form */}
      {showRecordForm && (
        <form onSubmit={handleRecordPayment} className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-steel/60">
            <h3 className="font-syne font-bold text-sm uppercase text-cream">Record Received Payment</h3>
            <button type="button" onClick={() => setShowRecordForm(false)} className="text-pewter hover:text-silver text-xs">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              >
                <option value="sales_deposit">Sales Deposit</option>
                <option value="reservation_deposit">Reservation Deposit</option>
                <option value="balance_payment">Balance Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Amount Received (£) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono font-bold text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              >
                <option value="bank_transfer">Bank Transfer (Faster Payments)</option>
                <option value="card">Debit / Credit Card</option>
                <option value="cash">Cash</option>
                <option value="finance">Direct Finance Advance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-pewter font-mono text-[11px] mb-1">Reference / Bank Transaction ID</label>
              <input
                type="text"
                value={providerRef}
                onChange={(e) => setProviderRef(e.target.value)}
                placeholder="e.g. Bank Ref #18823 / Card Terminal Auth 4482"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] text-cream outline-none focus:border-blue"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRecordForm(false)}
              className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-4 py-1.5 rounded-[2px] text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue hover:bg-blue/90 text-cream px-4 py-1.5 rounded-[2px] text-xs font-medium transition"
            >
              Save Payment
            </button>
          </div>
        </form>
      )}

      {/* Ledger Table */}
      <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
        <div className="p-4 border-b border-steel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-positive" />
            <h3 className="font-syne font-bold text-xs uppercase tracking-wide">Recorded Payments</h3>
          </div>
          <span className="font-mono text-xs text-cream font-bold">
            Total Paid: £{Number(depositPaid).toFixed(2)}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-pewter text-xs">
            No payments recorded yet. Click &quot;Record Payment&quot; or generate a Stripe deposit link.
          </div>
        ) : (
          <div className="divide-y divide-steel/40 text-xs">
            {payments.map((p) => (
              <div key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-asphalt/40 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cream text-sm">
                      £{Number(p.amount).toFixed(2)} {p.currency}
                    </span>
                    <span className="px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase bg-asphalt border border-steel text-silver">
                      {p.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase ${
                        p.status === 'verified'
                          ? 'bg-positive/20 text-positive border border-positive/40'
                          : p.status === 'recorded'
                          ? 'bg-blue/20 text-blue border border-blue/40'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {p.is_manually_recorded ? 'Manual' : 'Stripe Verified'} · {p.status}
                    </span>
                  </div>

                  <p className="text-pewter font-mono text-[11px] mt-1">
                    Method: {p.method.toUpperCase()} · Received:{' '}
                    {new Date(p.received_at || p.created_at).toLocaleDateString('en-GB')}
                    {p.provider_reference && ` · Ref: ${p.provider_reference}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateReceipt(p.id)}
                    className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-3 py-1.5 rounded-[2px] text-xs font-medium transition flex items-center gap-1"
                  >
                    <FileText size={12} /> Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
