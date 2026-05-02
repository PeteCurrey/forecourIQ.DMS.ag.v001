import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommandCentreClient from './command-centre-client'

export const metadata = {
  title: 'Command Centre | ForecourIQ DMS',
}

export default async function CommandCentrePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch initial data needed for command centre
  
  // 1. Dealership details for context
  const { data: dealership } = await supabase
    .from('dealerships')
    .select('name, city, county')
    .eq('id', profile.dealership_id)
    .single()

  // 2. Buying signals
  const { data: signals } = await supabase
    .from('buying_signals')
    .select('*')
    .eq('dealership_id', profile.dealership_id)
    .eq('status', 'active')
    .order('demand_score', { ascending: false })

  // 3. Market Data
  const { data: marketData } = await supabase
    .from('market_data')
    .select('*')
    .eq('dealership_id', profile.dealership_id)
    .order('demand_score', { ascending: false })

  // 4. Basic Stock Stats for Portfolio Health
  const { data: stock } = await supabase
    .from('vehicles')
    .select('id, make, asking_price, purchase_price, prep_cost, transport_cost, created_at, status')
    .eq('dealership_id', profile.dealership_id)
    .eq('status', 'available')

  return (
    <CommandCentreClient 
      dealership={dealership || {}}
      initialSignals={signals || []}
      marketData={marketData || []}
      stock={stock || []}
    />
  )
}
