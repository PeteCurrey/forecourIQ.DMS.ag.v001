'use client'

import { useState } from 'react'
import { Car, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function PXForm({
  dealershipSlug,
  interestedVehicleSlug,
  primaryColour = '#0EA5E9',
}: {
  dealershipSlug: string
  interestedVehicleSlug?: string
  primaryColour?: string
}) {
  const [reg, setReg] = useState('')
  const [mileage, setMileage] = useState('')
  const [condition, setCondition] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good')
  const [financeOutstanding, setFinanceOutstanding] = useState(false)
  const [financeSettlement, setFinanceSettlement] = useState('')
  const [notes, setNotes] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/public/part-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealership_slug: dealershipSlug,
          registration: reg.toUpperCase().trim(),
          mileage: Number(mileage),
          condition,
          finance_outstanding: financeOutstanding,
          finance_settlement: financeSettlement ? Number(financeSettlement) : undefined,
          additional_notes: notes,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          interested_vehicle_slug: interestedVehicleSlug,
          marketing_consent: marketingConsent,
          website: honeypot,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Unable to submit part exchange details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h3 className="font-bold text-gray-900 text-lg">Part Exchange Request Received!</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          Thank you for providing your vehicle details. We will review your submission and contact you with a fair, competitive valuation shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
      />

      {/* Vehicle Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
          <Car className="w-4 h-4 text-sky-600" />
          <span>1. Your Vehicle Details</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Vehicle Registration <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AB21 XYZ"
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              className="w-full text-sm font-mono uppercase font-bold rounded-lg border border-gray-300 py-2.5 px-3 bg-amber-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Current Mileage <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 45000"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2.5 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            General Condition <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['excellent', 'good', 'fair', 'poor'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border capitalize transition-all ${
                  condition === c
                    ? 'border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={financeOutstanding}
              onChange={(e) => setFinanceOutstanding(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Is there outstanding finance on this vehicle?</span>
          </label>

          {financeOutstanding && (
            <div className="mt-3 max-w-xs">
              <label className="block text-xs text-gray-600 mb-1">Estimated Settlement Amount (£)</label>
              <input
                type="number"
                placeholder="e.g. 6500"
                value={financeSettlement}
                onChange={(e) => setFinanceSettlement(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Additional Vehicle Notes / Service History details
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Full service history, recent tyres, 2 keys..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
          2. Your Contact Details
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="px-consent"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
          />
          <label htmlFor="px-consent" className="text-[11px] text-gray-500 leading-tight cursor-pointer">
            I agree to receive communications regarding this valuation.
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: primaryColour }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>Get My Part Exchange Valuation</span>
          </>
        )}
      </button>
    </form>
  )
}
