import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import LeadDetailClient from './lead-detail-client'

export const metadata = {
  title: 'Lead Details | ForecourIQ DMS',
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch the lead
  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      vehicles (id, make, model, registration, asking_price, photos, primary_photo_index),
      assigned:profiles!leads_assigned_to_fkey (id, full_name, role)
    `)
    .eq('id', params.id)
    .eq('dealership_id', profile.dealership_id)
    .single()

  if (error || !lead) {
    notFound()
  }

  // Fetch activities for this lead
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      creator:profiles!activities_created_by_fkey (id, full_name)
    `)
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false })

  return (
    <LeadDetailClient 
      lead={lead} 
      initialActivities={activities || []} 
    />
  )
}
