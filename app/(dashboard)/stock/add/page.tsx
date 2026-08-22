import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddVehicleForm from '@/components/stock/add-vehicle-form'

export const metadata = {
  title: 'Add Vehicle | ForecourIQ DMS',
}

export default async function AddVehiclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [locationsRes, teamRes] = await Promise.all([
    supabase.from('dealership_locations').select('id, name').eq('dealership_id', profile.dealership_id),
    supabase.from('profiles').select('id, full_name').eq('dealership_id', profile.dealership_id),
  ])

  return (
    <div className="min-h-[calc(100vh-56px)] bg-void py-8 px-6 overflow-y-auto">
      <AddVehicleForm 
        locations={locationsRes.data || []}
        teamMembers={teamRes.data || []}
      />
    </div>
  )
}
