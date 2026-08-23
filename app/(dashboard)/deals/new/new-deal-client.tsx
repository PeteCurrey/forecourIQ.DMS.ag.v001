'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { calcAgreedPrice, calcBalanceToFund, DealPaymentMethod } from '@/lib/services/deal-calc'
import { ArrowLeft, Handshake, Car, User, Calculator, CheckCircle2 } from 'lucide-react'

interface NewDealClientProps {
  initialLeadId?: string
  initialVehicleId?: string
  initialCustomerId?: string
  vehicles: Array<{ id: string; make: string; model: string; variant?: string | null; registration: string; asking_price: number }>
  customers: Array<{ id: string; first_name: string; last_name: string; email?: string; phone?: string }>
  teamMembers: Array<{ id: string; full_name: string }>
  currentUser: { id: string; full_name?: string }
}

export default function NewDealClient({
  initialLeadId,
  initialVehicleId,
  initialCustomerId,
  vehicles,
  customers,
  teamMembers,
  currentUser,
}: NewDealClientProps) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(initialVehicleId || '')
  const [customerId, setCustomerId] = useState(initialCustomerId || '')
  const [salespersonId, setSalespersonId] = useState(currentUser.id)
  const [paymentMethod, setPaymentMethod] = useState<DealPaymentMethod>('cash')
  const [retailPrice, setRetailPrice] = useState<number>(0)
  const [agreedPrice, setAgreedPrice] = useState<number>(0)
  const [depositRequired, setDepositRequired] = useState<number>(500)
  const [financeAmount, setFinanceAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-populate asking price when vehicle selected
  useEffect(() => {
    if (vehicleId) {
      const selected = vehicles.find((v) => v.id === vehicleId)
      if (selected && selected.asking_price) {
        setRetailPrice(Number(selected.asking_price))
        setAgreedPrice(Number(selected.asking_price))
      }
    }
  }, [vehicleId, vehicles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitting(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: initialLeadId || undefined,
          vehicle_id: vehicleId || undefined,
          customer_id: customerId || undefined,
          salesperson_id: salespersonId,
          payment_method: paymentMethod,
          vehicle_retail_price: Number(retailPrice) || 0,
          agreed_vehicle_price: Number(agreedPrice) || Number(retailPrice) || 0,
          deposit_required: Number(depositRequired) || 0,
          finance_amount: Number(financeAmount) || 0,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create deal')

      toast.success('Deal created successfully!')
      router.push(`/deals/${data.deal_id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/deals"
          className="p-1.5 bg-asphalt hover:bg-asphalt/80 text-pewter hover:text-cream border border-steel rounded-[2px] transition"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-syne font-bold text-2xl tracking-tight text-cream">Structure New Deal</h1>
          <p className="text-xs text-pewter">Initiate a commercial deal record from stock or existing customer.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-pewter font-mono text-xs mb-1.5 flex items-center gap-1.5">
                <Car size={13} className="text-blue" /> Target Vehicle
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] text-xs text-cream outline-none focus:border-blue"
              >
                <option value="">Select vehicle from available stock...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} — {v.make} {v.model} {v.variant || ''} (£{Number(v.asking_price).toLocaleString('en-GB')})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-pewter font-mono text-xs mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-blue" /> Buyer / Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] text-xs text-cream outline-none focus:border-blue"
              >
                <option value="">Select existing customer record...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.phone ? `(${c.phone})` : c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Salesperson */}
            <div>
              <label className="block text-pewter font-mono text-xs mb-1.5">Assigned Sales Executive</label>
              <select
                value={salespersonId}
                onChange={(e) => setSalespersonId(e.target.value)}
                className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] text-xs text-cream outline-none focus:border-blue"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-pewter font-mono text-xs mb-1.5">Expected Funding Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as DealPaymentMethod)}
                className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] text-xs text-cream outline-none focus:border-blue"
              >
                <option value="cash">Cash / Faster Payments</option>
                <option value="finance">Hire Purchase / PCP Finance</option>
                <option value="card">Debit / Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mixed">Mixed Split Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Pricing Parameters */}
          <div className="pt-4 border-t border-steel/60">
            <h3 className="font-syne font-bold text-xs uppercase text-cream tracking-wide mb-3 flex items-center gap-1.5">
              <Calculator size={14} className="text-blue" /> Initial Commercial Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-pewter font-mono text-[11px] mb-1">Vehicle Retail Price (£)</label>
                <input
                  type="number"
                  value={retailPrice || ''}
                  onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
                />
              </div>

              <div>
                <label className="block text-pewter font-mono text-[11px] mb-1">Initial Agreed Price (£)</label>
                <input
                  type="number"
                  value={agreedPrice || ''}
                  onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] font-mono font-bold text-cream outline-none focus:border-blue"
                />
              </div>

              <div>
                <label className="block text-pewter font-mono text-[11px] mb-1">Holding Deposit Required (£)</label>
                <input
                  type="number"
                  value={depositRequired || ''}
                  onChange={(e) => setDepositRequired(parseFloat(e.target.value) || 0)}
                  placeholder="500.00"
                  className="w-full bg-asphalt border border-steel px-3 py-2 rounded-[2px] font-mono text-cream outline-none focus:border-blue"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-pewter font-mono text-[11px] mb-1">Deal Notes / Special Instructions</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Agreed to MOT prior to collection. Customer bringing PX on inspection."
              className="w-full bg-asphalt border border-steel p-3 rounded-[2px] text-xs text-cream outline-none focus:border-blue"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/deals"
            className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-5 py-2 rounded-[2px] text-xs font-medium transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue hover:bg-blue/90 text-cream px-6 py-2 rounded-[2px] text-xs font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <CheckCircle2 size={14} /> Open Deal Workspace
          </button>
        </div>
      </form>
    </div>
  )
}
