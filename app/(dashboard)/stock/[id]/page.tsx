import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { VehicleService, VehicleRecord } from '@/lib/services/vehicle'
import VehicleHub from './vehicle-hub'

export const metadata = {
  title: 'Vehicle Hub | ForecourIQ DMS',
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  let vehicle: (VehicleRecord & { [key: string]: any }) | null = null
  let leads: any[] = []
  let deals: any[] = []
  let locations: any[] = []
  let teamMembers: any[] = []

  try {
    vehicle = await VehicleService.getById(profile.dealership_id, id)

    const [leadsRes, dealsRes, locationsRes, teamRes] = await Promise.all([
      supabase.from('leads').select('*').eq('dealership_id', profile.dealership_id).eq('vehicle_id', id),
      supabase.from('deals').select('*').eq('dealership_id', profile.dealership_id).eq('vehicle_id', id),
      supabase.from('dealership_locations').select('id, name').eq('dealership_id', profile.dealership_id),
      supabase.from('profiles').select('id, full_name').eq('dealership_id', profile.dealership_id)
    ])

    leads = leadsRes.data || []
    deals = dealsRes.data || []
    locations = locationsRes.data || []
    teamMembers = teamRes.data || []
  } catch {
    vehicle = null
  }

  if (!vehicle) {
    notFound()
  }

  return (
    <VehicleHub 
      vehicle={vehicle}
      costs={vehicle.vehicle_costs || []}
      prepJobs={vehicle.preparation_jobs || []}
      documents={vehicle.vehicle_documents || []}
      statusHistory={vehicle.vehicle_status_history || []}
      priceHistory={vehicle.vehicle_price_history || []}
      leads={leads}
      deals={deals}
      locations={locations}
      teamMembers={teamMembers}
    />
  )
}
