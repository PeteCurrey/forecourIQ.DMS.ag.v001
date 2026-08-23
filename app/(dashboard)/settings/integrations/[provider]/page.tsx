import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntegrationService } from '@/lib/services/integrations/integration-service'
import IntegrationDetailClient from './integration-detail-client'

export const metadata = {
  title: 'Integration Details | ForecourIQ DMS',
}

export default async function IntegrationDetailPage(props: {
  params: Promise<{ provider: string }>
}) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, dealership_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const integration = await IntegrationService.getByProvider(profile.dealership_id, params.provider)
  if (!integration) notFound()

  // Fetch recent integration runs
  const { data: runs } = await supabase
    .from('integration_runs')
    .select('*')
    .eq('dealership_id', profile.dealership_id)
    .eq('provider_id', params.provider)
    .order('created_at', { ascending: false })
    .limit(25)

  return (
    <IntegrationDetailClient
      integration={integration}
      initialRuns={runs || []}
      dealershipId={profile.dealership_id}
      userRole={profile.role}
    />
  )
}
