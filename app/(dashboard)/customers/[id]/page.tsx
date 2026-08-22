import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CustomerService, CustomerRecord } from '@/lib/services/customer'
import CustomerHub from './customer-hub'

export const metadata = {
  title: 'Customer Details | ForecourIQ DMS',
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  let customer: CustomerRecord | null = null
  try {
    customer = await CustomerService.getById(profile.dealership_id, id)
  } catch {
    customer = null
  }

  if (!customer) {
    notFound()
  }

  return <CustomerHub customer={customer} />
}
