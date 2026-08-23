import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import PXForm from '@/components/website/px-form'
import { Car, CheckCircle, ShieldCheck, HelpCircle } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Part Exchange Valuation | Free Instant Trade-In Quote',
    description: 'Get a fair, competitive trade-in valuation for your car against any of our quality used vehicles. Free and no obligation.',
  }
}

export default async function PartExchangePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>
}) {
  const sp = await searchParams
  const vehicleSlug = sp.vehicle
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  const dealer = targetId ? await WebsiteService.getPublicDealer(targetId) : null

  return (
    <div className="bg-gray-50/50 py-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
            <Car className="w-3.5 h-3.5" />
            <span>Part Exchange</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Value Your Part Exchange Vehicle
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Trade in your existing car seamlessly. We accept vehicles of all makes and models, and we can even settle existing finance agreements.
          </p>
        </div>

        {/* 3 Step Process Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Enter Details</h4>
            <p className="text-xs text-gray-500">
              Provide your registration, current mileage and general vehicle condition.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h4 className="font-bold text-gray-900 text-sm">We Value Your Car</h4>
            <p className="text-xs text-gray-500">
              Our appraisal team reviews current market values to provide a fair price.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Trade In & Drive Away</h4>
            <p className="text-xs text-gray-500">
              Use the trade-in allowance as your deposit towards your new car.
            </p>
          </div>
        </div>

        {/* The PX Form */}
        <PXForm
          dealershipSlug={dealer?.slug || ''}
          interestedVehicleSlug={vehicleSlug}
          primaryColour={dealer?.primary_colour}
        />
      </div>
    </div>
  )
}
