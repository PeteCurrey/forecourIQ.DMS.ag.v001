import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PreparationService } from '@/lib/services/preparation'
import PreparationClient from './preparation-client'

export const metadata = {
  title: 'Preparation Board | ForecourIQ DMS',
}

export default async function PreparationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const jobs = await PreparationService.list(profile.dealership_id)

  return <PreparationClient initialJobs={jobs} />
}
