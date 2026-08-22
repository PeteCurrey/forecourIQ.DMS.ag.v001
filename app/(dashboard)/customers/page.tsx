import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomerService } from '@/lib/services/customer'
import CustomersClient from './customers-client'

export const metadata = {
  title: 'Customers | ForecourIQ DMS',
}

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const customers = await CustomerService.list(profile.dealership_id)

  return <CustomersClient initialCustomers={customers} />
}
