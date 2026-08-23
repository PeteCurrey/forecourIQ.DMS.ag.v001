import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { ShieldCheck, Award, ThumbsUp, Wrench, Users, HeartHandshake } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'About Us | Trusted Quality Pre-Owned Vehicles',
    description: 'Learn about our dealership philosophy, inspection standards and commitment to customer service.',
  }
}

export default async function AboutPage() {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>About {dealerName}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Dedicated to Automotive Excellence
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We are an independent automotive retailer committed to providing handpicked, high-specification pre-owned vehicles backed by transparent customer care.
          </p>
        </div>

        {/* Core Values / Story */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-8 sm:p-10 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Our Standards & Philosophy</h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            Every vehicle in our showroom is selected with care. Before any car is listed for sale, it undergoes a meticulous multi-point mechanical inspection, complete provenance checks (HPI), and professional cosmetic preparation.
          </p>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            We operate with clear, transparent pricing and no pushy sales pressure. Whether you are buying your first car, upgrading your family SUV, or acquiring a high-performance vehicle, our experienced team is here to help at your pace.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">HPI Clear Provenance</h4>
                <p className="text-xs text-gray-500">Every car is guaranteed clear of write-off categories and outstanding finance.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">Full Pre-Sale Prep</h4>
                <p className="text-xs text-gray-500">Mechanical inspection, fresh MOT where applicable and full interior valet.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">Comprehensive Warranty</h4>
                <p className="text-xs text-gray-500">Enjoy complete peace of mind with our warranty coverage on every retail car.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">FCA Regulated</h4>
                <p className="text-xs text-gray-500">Authorised and regulated credit broker offering compliant finance solutions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
