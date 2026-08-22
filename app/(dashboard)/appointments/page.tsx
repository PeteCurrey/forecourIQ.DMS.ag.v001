import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentService } from '@/lib/services/appointment'
import AppointmentsClient from './appointments-client'

export const metadata = {
  title: 'Appointments | ForecourIQ DMS',
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const appointments = await AppointmentService.list(profile.dealership_id)

  return <AppointmentsClient initialAppointments={appointments} />
}
