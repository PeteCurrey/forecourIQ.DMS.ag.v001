import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewDealClient from './new-deal-client'

export const metadata = {
  title: 'Structure New Deal | ForecourIQ DMS',
}

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string; vehicle_id?: string; customer_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [vehiclesRes, customersRes, teamRes] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, make, model, variant, registration, year, asking_price, purchase_price, status')
      .eq('dealership_id', profile.dealership_id)
      .not('status', 'in', '("sold","completed","archived")')
      .order('created_at', { ascending: false }),
    supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone')
      .eq('dealership_id', profile.dealership_id)
      .order('last_name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('dealership_id', profile.dealership_id),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto text-cream">
      <NewDealClient
        initialLeadId={params.lead_id}
        initialVehicleId={params.vehicle_id}
        initialCustomerId={params.customer_id}
        vehicles={vehiclesRes.data || []}
        customers={customersRes.data || []}
        teamMembers={teamRes.data || []}
        currentUser={{ id: user.id, full_name: profile.full_name }}
      />
    </div>
  )
}
