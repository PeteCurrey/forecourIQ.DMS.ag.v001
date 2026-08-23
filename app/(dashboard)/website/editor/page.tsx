import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WebsiteService } from '@/lib/services/website/website-service'
import EditorClient from './editor-client'

export const metadata = {
  title: 'Homepage Section Editor | ForecourIQ DMS',
}

export default async function WebsiteEditorPage() {
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

  return <EditorClient initialWebsite={website} />
}
