import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { PublicStockService } from '@/lib/services/website/public-stock'
import ReservationFlow from '@/components/website/reservation-flow'
import { ChevronLeft } from 'lucide-react'

export default async function ReserveVehiclePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  if (!targetId) notFound()

  const dealer = await WebsiteService.getPublicDealer(targetId)
  const website = await WebsiteService.getOrCreate(targetId)
  const websiteConfig = {
    online_reservations_enabled: website.online_reservations_enabled,
    reservation_deposit_amount: website.reservation_deposit_amount,
    show_registration: website.show_registration,
    reserved_vehicle_policy: website.reserved_vehicle_policy,
  }

  const vehicle = await PublicStockService.getBySlug(targetId, slug, websiteConfig)
  if (!vehicle || !vehicle.is_reservable) notFound()

  return (
    <div className="bg-gray-50/50 py-10 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href={`/used-cars/${vehicle.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Vehicle</span>
        </Link>

        <ReservationFlow
          vehicle={vehicle}
          dealershipSlug={dealer?.slug || ''}
          depositAmount={website.reservation_deposit_amount ? Number(website.reservation_deposit_amount) : 299}
          policyText={website.reservation_policy_text}
          primaryColour={dealer?.primary_colour}
        />
      </div>
    </div>
  )
}
