import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WebsiteService } from '@/lib/services/website/website-service'
import BrandingClient from './branding-client'

export const metadata = {
  title: 'Website Branding | ForecourIQ DMS',
}

export default async function WebsiteBrandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const website = await WebsiteService.getOrCreate(profile.dealership_id)

  return <BrandingClient initialWebsite={website} />
}
