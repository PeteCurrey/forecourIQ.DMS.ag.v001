import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'

export async function generateMetadata() {
  return { title: 'Privacy Policy' }
}

export default async function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-400">Last updated: August 2026</p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">1. Introduction</h2>
            <p>
              {dealerName} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to protecting and respecting your privacy in compliance with UK GDPR and the Data Protection Act 2018.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">2. Information We Collect</h2>
            <p>We may collect and process the following data about you:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Information you provide when submitting enquiries, part exchange forms or reservation requests.</li>
              <li>Contact details including name, email address, phone number and postal address.</li>
              <li>Vehicle data relating to part exchange appraisals.</li>
              <li>Technical website analytics data regarding page views and browsing behavior.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">3. How We Use Your Information</h2>
            <p>We use information held about you to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Respond to your vehicle enquiries and provide requested quotes.</li>
              <li>Process online vehicle reservations and deposits.</li>
              <li>Introduce you to automotive finance providers where you have requested credit.</li>
              <li>Comply with our regulatory and legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">4. Contact Us</h2>
            <p>
              If you have any questions about this privacy notice, please contact us at {dealer?.email || 'sales@premiermotorgroup.co.uk'}.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
