import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import StockClient from './stock-client'

export const metadata = {
  title: 'Stock | ForecourIQ DMS',
}

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) {
    redirect('/onboarding')
  }

  // Fetch all vehicles for this dealership (filtering will be done client-side for immediate responsiveness)
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('dealership_id', profile.dealership_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-6 py-4 bg-void">
        <div className="flex items-center gap-3">
          <h1 className="font-syne font-bold text-2xl text-cream">Stock</h1>
          <span className="font-mono text-[11px] px-2 py-1 bg-asphalt border border-steel rounded-[2px] text-silver">
            {vehicles?.length || 0}
          </span>
        </div>
        <Button asChild variant="outline">
          <Link href="/stock/add" className="gap-2">
            <Plus size={16} /> ADD VEHICLE
          </Link>
        </Button>
      </div>

      <StockClient initialVehicles={vehicles || []} />
    </div>
  )
}
