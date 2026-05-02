import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import VehicleDetailClient from './vehicle-detail-client'

export const metadata = {
  title: 'Vehicle Details | ForecourIQ DMS',
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch the vehicle
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', params.id)
    .eq('dealership_id', profile.dealership_id)
    .single()

  if (error || !vehicle) {
    notFound()
  }

  // Fetch expenses for this vehicle
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('vehicle_id', vehicle.id)
    .order('created_at', { ascending: false })

  // Fetch leads for this vehicle
  const { data: leads } = await supabase
    .from('leads')
    .select('id, first_name, last_name, status, created_at')
    .eq('vehicle_id', vehicle.id)
    .order('created_at', { ascending: false })

  return (
    <VehicleDetailClient 
      vehicle={vehicle} 
      expenses={expenses || []} 
      leads={leads || []} 
    />
  )
}
