'use client'

import { useState } from 'react'
import { ShieldCheck, Lock, AlertCircle, Loader2, CreditCard } from 'lucide-react'
import type { PublicVehicle } from '@/lib/types/public-website'

export default function ReservationFlow({
  vehicle,
  dealershipSlug,
  depositAmount = 299,
  policyText,
  primaryColour = '#0EA5E9',
}: {
  vehicle: PublicVehicle
  dealershipSlug: string
  depositAmount?: number
  policyText?: string | null
  primaryColour?: string
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) {
      setError('Please agree to the reservation terms to continue.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/public/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealership_slug: dealershipSlug,
          vehicle_slug: vehicle.slug,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          notes,
          marketing_consent: consent,
          website: honeypot,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start reservation')

      if (data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url
      } else {
        throw new Error('Payment gateway did not provide a checkout link.')
      }
    } catch (err: any) {
      setError(err.message || 'Unable to proceed to payment. Please contact us directly.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-gray-100">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Official Vehicle Reservation</span>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">
          Reserve This {vehicle.year} {vehicle.make} {vehicle.model}
        </h2>
        <p className="text-xs text-gray-500">
          Place a fully refundable £{depositAmount} deposit to hold this vehicle and remove it from sale.
        </p>
      </div>

      <form onSubmit={handleStartReservation} className="space-y-4">
        {/* Honeypot */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
        />

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
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Notes / Collection Preference (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Planning to collect Saturday morning..."
            className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Policy & Terms */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2">
          <div className="font-semibold text-gray-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            <span>Reservation Terms</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {policyText ||
              `A deposit of £${depositAmount} holds this vehicle for 72 hours. Your deposit is fully deductible from the agreed purchase price or refundable upon inspection if the vehicle does not match its description.`}
          </p>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="res-consent"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
          />
          <label htmlFor="res-consent" className="text-[11px] text-gray-600 leading-tight cursor-pointer">
            I understand and accept the reservation terms and agree to pay the refundable deposit of £{depositAmount}.
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !consent}
          className="w-full py-3 px-4 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: primaryColour }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Proceed to Secure Deposit (£{depositAmount})</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
