import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'

export async function generateMetadata() {
  return { title: 'Cookie Policy' }
}

export default async function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          <p className="text-xs text-gray-400">Last updated: August 2026</p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">1. What Are Cookies</h2>
            <p>
              Cookies are small text files placed on your computer or mobile device when you visit our website. They are widely used to make websites work efficiently and provide operational analytics.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">2. Cookies We Use</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Essential Cookies:</strong> Required for the basic functioning of our website, security and online reservation sessions.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with stock listings and vehicle detail pages.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">3. Managing Cookies</h2>
            <p>
              You can control and manage cookies through your browser settings. Please note that disabling essential cookies may impact your ability to reserve vehicles online.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
