import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import PXForm from '@/components/website/px-form'
import { DollarSign, ShieldCheck, CheckCircle2, Clock } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Sell Your Car | Fast, Fair & Direct Vehicle Buying',
    description: 'Sell your car directly to us. Competitive valuations, fast payment and zero administrative fees. Free no-obligation quote.',
  }
}

export default async function SellYourCarPage() {
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
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Direct Vehicle Purchase</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Sell Your Car Directly to Us
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Skip the hassle of private listings, tyre kickers and auction fees. We buy cars directly with immediate bank transfers and prompt collection.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h4 className="font-bold text-gray-900 text-sm">No Hidden Fees</h4>
            <p className="text-xs text-gray-500">
              Unlike online buying services, we don&apos;t charge admin or transaction fees.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm space-y-2">
            <Clock className="w-6 h-6 text-sky-500" />
            <h4 className="font-bold text-gray-900 text-sm">Same-Day Payment</h4>
            <p className="text-xs text-gray-500">
              Funds are transferred directly to your bank account upon vehicle handover.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm space-y-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            <h4 className="font-bold text-gray-900 text-sm">Finance Cleared</h4>
            <p className="text-xs text-gray-500">
              We can settle any outstanding finance agreements directly with your lender.
            </p>
          </div>
        </div>

        {/* Sell Form */}
        <PXForm
          dealershipSlug={dealer?.slug || ''}
          primaryColour={dealer?.primary_colour}
        />
      </div>
    </div>
  )
}
