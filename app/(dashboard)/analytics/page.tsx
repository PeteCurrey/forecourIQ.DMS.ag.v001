import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RevenueChart from '@/components/analytics/revenue-chart'
import StockTurnChart from '@/components/analytics/stock-turn-chart'
import LeadSourceChart from '@/components/analytics/lead-source-chart'
import MarginByMakeChart from '@/components/analytics/margin-by-make-chart'
import { formatCurrency } from '@/lib/format'

export const metadata = {
  title: 'Analytics | ForecourIQ DMS',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  // Fetch data for analytics
  const { data: soldVehicles } = await supabase
    .from('vehicles')
    .select('make, sold_price, purchase_price, prep_cost, transport_cost, created_at, sold_at')
    .eq('dealership_id', profile.dealership_id)
    .eq('status', 'sold')

  const { data: leads } = await supabase
    .from('leads')
    .select('source, status')
    .eq('dealership_id', profile.dealership_id)

  // Calculate summary stats
  const totalRevenue = soldVehicles?.reduce((acc, v) => acc + Number(v.sold_price || 0), 0) || 0
  const vehiclesSold = soldVehicles?.length || 0

  let bestMake = { make: '-', count: 0 }
  let bestMarginVehicle = { make: '-', margin: 0 }

  if (soldVehicles && soldVehicles.length > 0) {
    const makeCounts: Record<string, number> = {}
    
    soldVehicles.forEach(v => {
      // Best make by volume
      makeCounts[v.make] = (makeCounts[v.make] || 0) + 1
      if (makeCounts[v.make] > bestMake.count) {
        bestMake = { make: v.make, count: makeCounts[v.make] }
      }

      // Best margin vehicle
      const totalCost = Number(v.purchase_price || 0) + Number(v.prep_cost || 0) + Number(v.transport_cost || 0)
      const margin = Number(v.sold_price || 0) - totalCost
      if (margin > bestMarginVehicle.margin) {
        bestMarginVehicle = { make: v.make, margin }
      }
    })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1600px] mx-auto w-full pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-syne font-bold text-[28px] text-cream mb-1">Analytics</h1>
          <p className="font-inter text-[14px] text-pewter">Performance metrics based on all historical data</p>
        </div>
        <select className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-[11px] text-cream uppercase tracking-wider focus:outline-none focus:border-blue">
          <option value="90">Last 90 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="7">Last 7 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-2">Total Revenue</p>
          <p className="font-mono text-[32px] text-cream leading-none">{formatCurrency(totalRevenue)}</p>
        </div>
        
        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-2">Vehicles Sold</p>
          <p className="font-syne font-bold text-[32px] text-cream leading-none">{vehiclesSold}</p>
        </div>
        
        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-2">Best Performing Make</p>
          <div className="flex items-end gap-3">
            <p className="font-syne font-bold text-[32px] text-blue leading-none truncate">{bestMake.make}</p>
            <p className="font-mono text-[12px] text-silver mb-1">{bestMake.count} sold</p>
          </div>
        </div>
        
        <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-2">Best Margin</p>
          <div className="flex items-end gap-3 truncate">
            <p className="font-mono text-[32px] text-positive font-bold leading-none">{formatCurrency(bestMarginVehicle.margin)}</p>
            <p className="font-inter text-[12px] text-silver mb-1 truncate">{bestMarginVehicle.make}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart soldVehicles={soldVehicles || []} />
        <StockTurnChart soldVehicles={soldVehicles || []} />
        <LeadSourceChart leads={leads || []} />
        <MarginByMakeChart soldVehicles={soldVehicles || []} />
      </div>

    </div>
  )
}
