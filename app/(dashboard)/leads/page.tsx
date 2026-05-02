import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeadsClient from './leads-client'

export const metadata = {
  title: 'Leads | ForecourIQ DMS',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch leads
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      vehicles (make, model, registration),
      assigned:profiles!leads_assigned_to_fkey (full_name)
    `)
    .eq('dealership_id', profile.dealership_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      <LeadsClient initialLeads={leads || []} />
    </div>
  )
}
