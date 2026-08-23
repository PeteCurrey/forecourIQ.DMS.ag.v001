import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { PublicStockService } from '@/lib/services/website/public-stock'
import VehicleCard from '@/components/website/vehicle-card'
import VehicleSearch from '@/components/website/vehicle-search'
import type { PublicStockFilters } from '@/lib/types/public-website'

export async function generateMetadata() {
  return {
    title: 'Used Cars for Sale | Quality Pre-Owned Vehicles',
    description: 'Browse our complete inventory of inspected, quality assured used vehicles with warranty and finance options available.',
  }
}

export default async function UsedCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  const filters: PublicStockFilters = {
    make: typeof sp.make === 'string' ? sp.make : undefined,
    model: typeof sp.model === 'string' ? sp.model : undefined,
    fuel_type: typeof sp.fuel_type === 'string' ? sp.fuel_type : undefined,
    transmission: typeof sp.transmission === 'string' ? sp.transmission : undefined,
    body_type: typeof sp.body_type === 'string' ? sp.body_type : undefined,
    min_price: sp.min_price ? Number(sp.min_price) : undefined,
    max_price: sp.max_price ? Number(sp.max_price) : undefined,
    sort: (sp.sort as PublicStockFilters['sort']) ?? 'newest',
    page: sp.page ? Number(sp.page) : 1,
    per_page: 24,
  }

  let vehicles: any[] = []
  let total = 0
  let availableMakes: string[] = []
  let primaryColour = '#0EA5E9'

  if (targetId) {
    const website = await WebsiteService.getOrCreate(targetId)
    primaryColour = website.primary_colour || '#0EA5E9'
    const websiteConfig = {
      online_reservations_enabled: website.online_reservations_enabled,
      reservation_deposit_amount: website.reservation_deposit_amount,
      show_registration: website.show_registration,
      reserved_vehicle_policy: website.reserved_vehicle_policy,
    }

    const [stockRes, makes] = await Promise.all([
      PublicStockService.list(targetId, filters, websiteConfig),
      PublicStockService.getAvailableMakes(targetId),
    ])

    vehicles = stockRes.vehicles
    total = stockRes.total
    availableMakes = makes
  }

  return (
    <div className="bg-gray-50/50 py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Used Cars for Sale
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Showing {vehicles.length} of {total} available vehicles
          </p>
        </div>

        {/* Search & Filter Bar */}
        <VehicleSearch availableMakes={availableMakes} primaryColour={primaryColour} />

        {/* Vehicle Grid */}
        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} primaryColour={primaryColour} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <h3 className="text-base font-bold text-gray-900">No vehicles match your search</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try adjusting or clearing your filters to see more of our available stock.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
