'use client'

import { useState } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function EnquiryForm({
  dealershipSlug,
  vehicleSlug,
  vehicleTitle,
  primaryColour = '#0EA5E9',
}: {
  dealershipSlug: string
  vehicleSlug?: string
  vehicleTitle?: string
  primaryColour?: string
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(
    vehicleTitle
      ? `Hi, I am interested in the ${vehicleTitle}. Please get in touch to arrange a viewing.`
      : 'Hi, I would like more information about your current stock and services.'
  )
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone' | 'any'>('any')
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
      const res = await fetch('/api/public/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealership_slug: dealershipSlug,
          vehicle_slug: vehicleSlug,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          message,
          preferred_contact: preferredContact,
          marketing_consent: marketingConsent,
          website: honeypot, // honeypot
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send enquiry')

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please call us directly.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h4 className="font-bold text-gray-900 text-base">Enquiry Received!</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Thank you for getting in touch. A member of our team will be in contact shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
      <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
        {vehicleTitle ? `Enquire about this ${vehicleTitle}` : 'Send Us a Message'}
      </h3>

      {/* Honeypot field — hidden from real users */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
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

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full text-xs rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Preferred Contact Method
        </label>
        <div className="flex gap-4 text-xs text-gray-700">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="preferred_contact"
              value="any"
              checked={preferredContact === 'any'}
              onChange={() => setPreferredContact('any')}
            />
            <span>Either</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="preferred_contact"
              value="email"
              checked={preferredContact === 'email'}
              onChange={() => setPreferredContact('email')}
            />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="preferred_contact"
              value="phone"
              checked={preferredContact === 'phone'}
              onChange={() => setPreferredContact('phone')}
            />
            <span>Phone</span>
          </label>
        </div>
      </div>

      <div className="flex items-start gap-2 pt-1">
        <input
          type="checkbox"
          id="marketing"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
        />
        <label htmlFor="marketing" className="text-[11px] text-gray-500 leading-tight cursor-pointer">
          I agree to receive occasional updates about relevant vehicles and services. You can unsubscribe at any time.
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: primaryColour }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>Send Enquiry</span>
          </>
        )}
      </button>
    </form>
  )
}
