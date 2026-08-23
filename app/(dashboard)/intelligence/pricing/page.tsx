import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PricingService } from '@/lib/services/intelligence/pricing-service'
import PricingClient from './pricing-client'

export const metadata = {
  title: 'Pricing Intelligence | ForecourIQ DMS',
}

export default async function PricingIntelligencePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, dealerships(name, city, county)')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const dealership = profile.dealerships as any
  const signals = await PricingService.getPricingSignals(profile.dealership_id)

  return (
    <PricingClient
      dealership={dealership || { name: 'Dealership' }}
      initialSignals={signals}
      userId={user.id}
    />
  )
}
