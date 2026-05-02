import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './settings-client'

export const metadata = {
  title: 'Settings | ForecourIQ DMS',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, dealership:dealerships(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch all team members for this dealership
  const { data: team } = await supabase
    .from('profiles')
    .select('*')
    .eq('dealership_id', profile.dealership_id)

  return (
    <SettingsClient 
      user={user} 
      profile={profile} 
      dealership={profile.dealership}
      team={team || []}
    />
  )
}
