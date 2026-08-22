import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConversationService } from '@/lib/services/conversation'
import InboxClient from './inbox-client'

export const metadata = {
  title: 'Unified Customer Inbox | ForecourIQ DMS',
}

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, dealership_id, dealerships(name, city, phone)')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [conversations, teamRes] = await Promise.all([
    ConversationService.list(profile.dealership_id),
    supabase.from('profiles').select('id, full_name, email, role').eq('dealership_id', profile.dealership_id),
  ])

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-void">
      <InboxClient 
        initialConversations={conversations}
        teamMembers={teamRes.data || []}
        currentUser={{ id: user.id, full_name: profile.full_name, role: profile.role }}
        dealership={profile.dealerships as any}
      />
    </div>
  )
}
