'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Home } from 'lucide-react'

export default function ReservationSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reservation_id?: string; session_id?: string }>
}) {
  const { slug } = use(params)
  const sp = use(searchParams)
  const reservationId = sp.reservation_id
  const sessionId = sp.session_id

  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function confirm() {
      if (!reservationId || !sessionId) {
        setError('Missing reservation confirmation parameters.')
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/public/reservation/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservation_id: reservationId, session_id: sessionId }),
        })

        const data = await res.json()
        if (data.confirmed) {
          setConfirmed(true)
          setMessage(data.message)
        } else {
          setError(data.error || 'Payment verification pending. Our team will verify your deposit manually.')
        }
      } catch (err: any) {
        setError(err.message || 'Unable to confirm reservation automatically.')
      } finally {
        setLoading(false)
      }
    }

    confirm()
  }, [reservationId, sessionId])

  return (
    <div className="bg-gray-50/50 py-16 min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="bg-white rounded-3xl border border-gray-200/90 p-8 text-center shadow-lg space-y-6">
          {loading ? (
            <div className="py-8 space-y-4">
              <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto" />
              <h3 className="font-bold text-gray-900 text-lg">Verifying Your Deposit...</h3>
              <p className="text-xs text-gray-500">
                Please wait while we confirm your payment with the banking gateway.
              </p>
            </div>
          ) : confirmed ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Vehicle Reserved Successfully!
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {message ||
                  'Your deposit has been received and this vehicle has been taken off sale. Our sales team will call you shortly to arrange a viewing and collection date.'}
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/used-cars"
                  className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Browse More Stock</span>
                </Link>
                <Link
                  href="/"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Homepage</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Reservation Verification Notice
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                {error || 'Your deposit was processed, but we are awaiting final confirmation from your bank.'}
              </p>
              <div className="pt-2">
                <Link
                  href={`/used-cars/${slug}`}
                  className="px-5 py-2.5 text-xs font-bold text-gray-900 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors inline-block"
                >
                  Return to Vehicle Details
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
