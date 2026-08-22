import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VehicleService } from '@/lib/services/vehicle'
import StockClient from './stock-client'

export const metadata = {
  title: 'Stockbook | ForecourIQ DMS',
}

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) {
    redirect('/onboarding')
  }

  // Fetch real vehicles and real KPI metrics from database
  const [stockResult, kpis, locationsRes, teamRes] = await Promise.all([
    VehicleService.list(profile.dealership_id, { limit: 500 }),
    VehicleService.getStockKPIs(profile.dealership_id),
    supabase.from('dealership_locations').select('id, name').eq('dealership_id', profile.dealership_id),
    supabase.from('profiles').select('id, full_name').eq('dealership_id', profile.dealership_id)
  ])

  return (
    <StockClient 
      initialVehicles={stockResult.vehicles}
      kpis={kpis}
      locations={locationsRes.data || []}
      teamMembers={teamRes.data || []}
    />
  )
}
