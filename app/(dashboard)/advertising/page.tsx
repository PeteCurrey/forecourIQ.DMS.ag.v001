import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdvertisingService } from '@/lib/services/integrations/advertising'
import { IntegrationService } from '@/lib/services/integrations/integration-service'
import AdvertisingClient from './advertising-client'

export const metadata = {
  title: 'Advertising Feeds | ForecourIQ DMS',
}

export default async function AdvertisingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, dealership_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch listings, vehicles, errors, and integrations
  const [listings, errorQueue, integrations, { data: vehicles }] = await Promise.all([
    AdvertisingService.listListings(profile.dealership_id),
    AdvertisingService.getErrorQueue(profile.dealership_id),
    IntegrationService.listForDealership(profile.dealership_id),
    supabase
      .from('vehicles')
      .select('id, registration, make, model, variant, asking_price, status, fuel_type, mileage, photos')
      .eq('dealership_id', profile.dealership_id)
      .in('status', ['ready_for_sale', 'available', 'advertised', 'reserved'])
      .order('created_at', { ascending: false }),
  ])

  const advertisingIntegrations = integrations.filter((i) => i.category === 'advertising')

  return (
    <AdvertisingClient
      initialListings={listings}
      initialErrors={errorQueue}
      vehicles={vehicles || []}
      advertisingIntegrations={advertisingIntegrations}
      dealershipId={profile.dealership_id}
      userRole={profile.role}
    />
  )
}
