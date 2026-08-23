import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from '@/lib/services/integrations/integration-service'
import SettingsIntegrationsClient from './settings-integrations-client'

export const metadata = {
  title: 'Integrations | ForecourIQ DMS',
}

export default async function SettingsIntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, dealership_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) {
    redirect('/onboarding')
  }

  const integrations = await IntegrationService.listForDealership(profile.dealership_id)

  return (
    <SettingsIntegrationsClient
      initialIntegrations={integrations}
      dealershipId={profile.dealership_id}
      userRole={profile.role}
    />
  )
}
