import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'

export async function generateMetadata() {
  return { title: 'Terms & Conditions' }
}

export default async function TermsPage() {
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  const dealer = targetId ? await WebsiteService.getPublicDealer(targetId) : null
  const dealerName = dealer?.name || 'Our Dealership'

  return (
    <div className="bg-gray-50/50 py-12 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-white rounded-3xl border border-gray-200/90 p-8 sm:p-10 shadow-sm space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs text-gray-400">Last updated: August 2026</p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">1. Website Use</h2>
            <p>
              By accessing and using the website of {dealerName}, you agree to comply with and be bound by these terms. Vehicle details and specifications are presented in good faith based on manufacturer information and inspection.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">2. Online Reservations</h2>
            <p>
              When reserving a vehicle online, your deposit holds the vehicle for up to 72 hours. A reservation does not constitute a completed sale agreement until physical inspection and formal handover documents are completed. Deposits are refundable upon physical inspection if the vehicle does not match the description.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">3. Finance & Credit Brokerage</h2>
            <p>
              {dealerName} is an authorised credit broker, not a direct lender. Any finance quotations displayed or provided are illustrative and subject to underwriting approval, credit assessment and formal lender documentation.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
