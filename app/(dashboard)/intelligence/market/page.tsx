import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MarketService } from '@/lib/services/intelligence/market-service'
import MarketClient from './market-client'

export const metadata = {
  title: 'Market Intelligence | ForecourIQ DMS',
}

export default async function MarketIntelligencePage() {
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

  const [overview, stockTurns, websiteDemand] = await Promise.all([
    MarketService.getMarketOverview(profile.dealership_id),
    MarketService.getStockTurnMetrics(profile.dealership_id),
    MarketService.getWebsiteDemandMetrics(profile.dealership_id),
  ])

  return (
    <MarketClient
      dealership={dealership || { name: 'Dealership' }}
      overview={overview}
      stockTurns={stockTurns}
      websiteDemand={websiteDemand}
    />
  )
}
