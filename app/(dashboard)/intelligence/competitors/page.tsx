import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompetitorService } from '@/lib/services/intelligence/competitor-service'
import CompetitorsClient from './competitors-client'

export const metadata = {
  title: 'Competitor Tracking | ForecourIQ DMS',
}

export default async function CompetitorIntelligencePage() {
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

  const [competitors, activity] = await Promise.all([
    CompetitorService.getCompetitors(profile.dealership_id),
    CompetitorService.getActivityFeed(profile.dealership_id),
  ])

  return (
    <CompetitorsClient
      dealership={dealership || { name: 'Dealership' }}
      initialCompetitors={competitors}
      initialActivity={activity}
      userId={user.id}
    />
  )
}
