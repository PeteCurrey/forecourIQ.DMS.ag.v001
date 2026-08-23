import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DealService } from '@/lib/services/deal'
import { hasPermission } from '@/lib/rbac/permissions'
import DealsClient from './deals-client'

export const metadata = {
  title: 'Deal Desk | ForecourIQ DMS',
}

export default async function DealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [deals, canReadMargin, teamRes, vehiclesRes, customersRes] = await Promise.all([
    DealService.list(profile.dealership_id),
    hasPermission(profile.dealership_id, user.id, 'margin.read'),
    supabase.from('profiles').select('id, full_name, email, role').eq('dealership_id', profile.dealership_id),
    supabase
      .from('vehicles')
      .select('id, make, model, registration, asking_price, status')
      .eq('dealership_id', profile.dealership_id)
      .not('status', 'in', '("sold","completed","archived")'),
    supabase.from('customers').select('id, first_name, last_name, email, phone').eq('dealership_id', profile.dealership_id),
  ])

  // Filter margin data if not permitted
  const safeDeals = canReadMargin
    ? deals
    : deals.map((d) => {
        const { gross_margin_projected, gross_margin_actual, vehicles, ...rest } = d
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
        return { ...rest, vehicles: safeVehicle }
      })

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-void">
      <DealsClient
        initialDeals={safeDeals as any}
        canReadMargin={canReadMargin}
        teamMembers={teamRes.data || []}
        vehicles={vehiclesRes.data || []}
        customers={customersRes.data || []}
        currentUser={{ id: user.id, full_name: profile.full_name, role: profile.role }}
      />
    </div>
  )
}
