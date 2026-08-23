import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WebsiteService } from '@/lib/services/website/website-service'
import { DomainService } from '@/lib/services/website/domain-service'
import WebsiteClient from './website-client'

export const metadata = {
  title: 'Dealer Website | ForecourIQ DMS',
}

export default async function WebsitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [website, domains, stockCountRes, leadCountRes] = await Promise.all([
    WebsiteService.getOrCreate(profile.dealership_id),
    DomainService.getDomains(profile.dealership_id),
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', profile.dealership_id)
      .eq('website_ready', true)
      .in('status', ['advertised', 'available', 'reserved']),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', profile.dealership_id)
      .eq('source', 'dealer_website'),
  ])

  return (
    <WebsiteClient
      initialWebsite={website}
      domains={domains}
      stockCount={stockCountRes.count ?? 0}
      leadCount={leadCountRes.count ?? 0}
    />
  )
}
