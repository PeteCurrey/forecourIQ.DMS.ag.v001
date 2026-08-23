import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BuyingService } from '@/lib/services/intelligence/buying-service'
import { StrategyService } from '@/lib/services/intelligence/strategy-service'
import BuyingClient from './buying-client'

export const metadata = {
  title: 'Buying Intelligence | ForecourIQ DMS',
}

export default async function BuyingIntelligencePage() {
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

  const [signals, watchlist, settings] = await Promise.all([
    BuyingService.getBuyingSignals(profile.dealership_id),
    BuyingService.getWatchlist(profile.dealership_id),
    StrategyService.getSettings(profile.dealership_id),
  ])

  return (
    <BuyingClient
      dealership={dealership || { name: 'Dealership' }}
      initialSignals={signals}
      initialWatchlist={watchlist}
      settings={settings}
      userId={user.id}
    />
  )
}
