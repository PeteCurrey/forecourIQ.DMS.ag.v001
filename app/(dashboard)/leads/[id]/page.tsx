import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { LeadService } from '@/lib/services/lead'
import { ConversationService } from '@/lib/services/conversation'
import LeadDetailClient from './lead-detail-client'

export const metadata = {
  title: 'Lead Opportunity Workspace | ForecourIQ DMS',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, dealership_id, dealerships(name, city, phone)')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  let lead: any
  let conversation: any
  let teamMembers: any[] = []
  let tasks: any[] = []
  let appointments: any[] = []

  try {
    lead = await LeadService.getById(profile.dealership_id, id)
    
    // Get or initialize conversation
    conversation = await ConversationService.getOrCreateForLead(
      profile.dealership_id,
      lead.id,
      lead.customer_id,
      lead.channel || 'web'
    )

    const [teamRes, tasksRes, apptsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role').eq('dealership_id', profile.dealership_id),
      supabase.from('tasks').select('*').eq('dealership_id', profile.dealership_id).eq('lead_id', lead.id).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('dealership_id', profile.dealership_id).eq('lead_id', lead.id).order('start_time', { ascending: true }),
    ])

    teamMembers = teamRes.data || []
    tasks = tasksRes.data || []
    appointments = apptsRes.data || []
  } catch (err) {
    notFound()
  }

  return (
    <LeadDetailClient 
      lead={lead} 
      initialConversation={conversation}
      teamMembers={teamMembers}
      initialTasks={tasks}
      initialAppointments={appointments}
      currentUser={{ id: user.id, full_name: profile.full_name, role: profile.role }}
      dealership={profile.dealerships as any}
    />
  )
}
