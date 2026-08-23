import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StrategyService } from '@/lib/services/intelligence/strategy-service'
import IntelligenceSettingsClient from './intelligence-settings-client'

export const metadata = {
  title: 'Intelligence Strategy Settings | ForecourIQ DMS',
}

export default async function IntelligenceSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, dealerships(name)')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const settings = await StrategyService.getSettings(profile.dealership_id)

  return (
    <IntelligenceSettingsClient
      dealership={profile.dealerships as any || { name: 'Dealership' }}
      initialSettings={settings}
      userId={user.id}
    />
  )
}
