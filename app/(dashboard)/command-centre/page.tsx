import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MarketService } from '@/lib/services/intelligence/market-service'
import { BuyingService } from '@/lib/services/intelligence/buying-service'
import { PricingService } from '@/lib/services/intelligence/pricing-service'
import { StockRiskService } from '@/lib/services/intelligence/stock-risk-service'
import CommandCentreClient from './command-centre-client'

export const metadata = {
  title: 'Commercial Command Centre | ForecourIQ DMS',
}

export default async function CommandCentrePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, dealerships(id, name, city, county)')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const dealership = (profile.dealerships as any) || {
    id: profile.dealership_id,
    name: 'Your Dealership',
    city: 'UK',
    county: 'UK',
  }

  const [overview, buyingSignals, pricingSignals, capitalExposure, stockRiskSignals] = await Promise.all([
    MarketService.getMarketOverview(profile.dealership_id),
    BuyingService.getBuyingSignals(profile.dealership_id),
    PricingService.getPricingSignals(profile.dealership_id),
    StockRiskService.getCapitalExposureSummary(profile.dealership_id),
    StockRiskService.getStockRiskSignals(profile.dealership_id),
  ])

  return (
    <CommandCentreClient
      dealership={dealership}
      overview={overview}
      buyingSignals={buyingSignals}
      pricingSignals={pricingSignals}
      capitalExposure={capitalExposure}
      stockRiskSignals={stockRiskSignals}
      userId={user.id}
    />
  )
}
