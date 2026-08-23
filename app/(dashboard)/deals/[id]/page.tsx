import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { DealService } from '@/lib/services/deal'
import { hasPermission } from '@/lib/rbac/permissions'
import DealDetailClient from './deal-detail-client'

export const metadata = {
  title: 'Deal Workspace | ForecourIQ DMS',
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [deal, canReadMargin] = await Promise.all([
    DealService.getById(profile.dealership_id, id),
    hasPermission(profile.dealership_id, user.id, 'margin.read'),
  ])

  if (!deal) notFound()

  // Cleanse margin data if user does not have permission
  let safeDeal = deal
  if (!canReadMargin) {
    const { gross_margin_projected, gross_margin_actual, vehicles, ...rest } = deal
    const safeVehicle = vehicles
      ? {
          ...vehicles,
          purchase_price: undefined,
          auction_fee: undefined,
          transport_cost: undefined,
          prep_cost: undefined,
          other_acquisition_costs: undefined,
        }
      : vehicles
    safeDeal = {
      ...rest,
      vehicles: safeVehicle,
    } as any
  }

  return (
    <div className="p-6 max-w-7xl mx-auto text-cream">
      <DealDetailClient
        deal={safeDeal}
        canReadMargin={canReadMargin}
        currentUser={{ id: user.id, full_name: profile.full_name, role: profile.role }}
      />
    </div>
  )
}
