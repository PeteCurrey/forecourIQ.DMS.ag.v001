import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'
import { formatDistanceToNow, format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, Info, TrendingDown } from 'lucide-react'
import DashboardCharts from '@/components/dashboard/dashboard-charts'
import BuyingSignalsPreview from '@/components/dashboard/buying-signals-preview'

async function getDashboardData(dealershipId: string) {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    { data: vehicles },
    { data: leads48h },
    { data: leadsMonth },
    { data: soldThisMonth },
    { data: soldLastMonth },
    { data: recentLeads },
    { data: buyingSignals },
  ] = await Promise.all([
    supabase.from('vehicles').select('*').eq('dealership_id', dealershipId).eq('status', 'available'),
    supabase.from('leads').select('id').eq('dealership_id', dealershipId).gte('created_at', subDays(now, 2).toISOString()),
    supabase.from('leads').select('id').eq('dealership_id', dealershipId).gte('created_at', startOfMonth.toISOString()),
    supabase.from('vehicles').select('sold_price, purchase_price, prep_cost, transport_cost').eq('dealership_id', dealershipId).eq('status', 'sold').gte('sold_at', startOfMonth.toISOString()),
    supabase.from('vehicles').select('sold_price, purchase_price, prep_cost, transport_cost').eq('dealership_id', dealershipId).eq('status', 'sold').gte('sold_at', lastMonth.toISOString()).lte('sold_at', endLastMonth.toISOString()),
    supabase.from('leads').select('*, vehicles(make, model, registration)').eq('dealership_id', dealershipId).order('created_at', { ascending: false }).limit(8),
    supabase.from('buying_signals').select('*').eq('dealership_id', dealershipId).eq('status', 'active').order('demand_score', { ascending: false }).limit(3),
  ])

  // Compute avg days on plot
  const avgDays = vehicles?.length
    ? Math.round(
        vehicles.reduce((acc, v) => {
          const days = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
          return acc + days
        }, 0) / vehicles.length
      )
    : 0

  // Compute margin MTD
  const marginMTD = (soldThisMonth || []).reduce((acc, v) => {
    const margin = (v.sold_price || 0) - (v.purchase_price || 0) - (v.prep_cost || 0) - (v.transport_cost || 0)
    return acc + margin
  }, 0)

  const marginLastMonth = (soldLastMonth || []).reduce((acc, v) => {
    const margin = (v.sold_price || 0) - (v.purchase_price || 0) - (v.prep_cost || 0) - (v.transport_cost || 0)
    return acc + margin
  }, 0)

  return {
    stockCount: vehicles?.length || 0,
    vehicles: vehicles || [],
    leads48h: leads48h?.length || 0,
    leadsMonth: leadsMonth?.length || 0,
    avgDays,
    marginMTD,
    marginLastMonth,
    recentLeads: recentLeads || [],
    buyingSignals: buyingSignals || [],
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, dealership_id, dealerships(name, city)')
    .eq('id', user.id)
    .single()

  const dealershipId = profile?.dealership_id
  const dealershipName = (profile?.dealerships as any)?.name || 'Your Dealership'

  const data = dealershipId ? await getDashboardData(dealershipId) : {
    stockCount: 35, vehicles: [], leads48h: 4, leadsMonth: 24,
    avgDays: 22, marginMTD: 48500, marginLastMonth: 41200,
    recentLeads: [], buyingSignals: [],
  }

  const now = new Date()
  const hour = now.getHours()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const daysColor = data.avgDays < 25 ? 'text-positive' : data.avgDays < 40 ? 'text-warning' : 'text-negative'
  const marginChange = data.marginLastMonth > 0
    ? ((data.marginMTD - data.marginLastMonth) / data.marginLastMonth) * 100
    : 0

  // Alerts
  const overage45 = (data.vehicles || []).filter(v => {
    const days = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return days > 45
  })

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-syne font-bold text-3xl text-cream">
          {greeting}, {firstName}.
        </h1>
        <p className="font-inter text-sm text-silver mt-1">
          {dealershipName} · {format(now, 'EEEE d MMMM yyyy')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stock on Plot */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-4">Stock on Plot</p>
          <p className="font-syne font-bold text-5xl text-cream mb-2">
            <span className="font-mono">{data.stockCount}</span>
          </p>
          <p className="font-inter text-[13px] text-silver mb-2">vehicles available</p>
          <p className="font-mono text-[11px] text-positive">+3 added this month</p>
        </div>

        {/* New Leads 48h */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-4">New Leads (48H)</p>
          <p className="font-syne font-bold text-5xl text-cream mb-2">
            <span className="font-mono">{data.leads48h}</span>
          </p>
          <p className="font-inter text-[13px] text-silver mb-2">in last 48 hours</p>
          <p className="font-mono text-[11px] text-silver">
            <span className="font-mono">{data.leadsMonth}</span> total this month
          </p>
        </div>

        {/* Avg Days on Plot */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-4">Avg Days on Plot</p>
          <p className={cn("font-syne font-bold text-5xl mb-2", daysColor)}>
            <span className="font-mono">{data.avgDays}</span>
          </p>
          <p className="font-inter text-[13px] text-silver mb-2">days average</p>
          <p className="font-mono text-[11px] text-pewter">Market avg: <span className="font-mono">31</span> days</p>
        </div>

        {/* Margin MTD */}
        <div className="bg-carbon border border-steel rounded-[2px] p-6">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mb-4">Margin MTD</p>
          <p className="font-syne font-bold text-5xl text-cream mb-2">
            <span className="font-mono">{formatCurrency(data.marginMTD)}</span>
          </p>
          <p className="font-inter text-[13px] text-silver mb-2">gross margin this month</p>
          <p className={cn(
            "font-mono text-[11px]",
            marginChange >= 0 ? "text-positive" : "text-negative"
          )}>
            {marginChange >= 0 ? '+' : ''}<span className="font-mono">{marginChange.toFixed(1)}</span>% vs last month
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <DashboardCharts vehicles={data.vehicles} />

      {/* Leads & Alerts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Recent Leads */}
        <div className="xl:col-span-3 bg-carbon border border-steel rounded-[2px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-syne font-bold text-base text-cream">Recent Leads</h2>
            <Link href="/leads" className="font-mono text-[11px] text-blue hover:underline uppercase tracking-wider flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            {data.recentLeads.length > 0 ? data.recentLeads.map((lead: any) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between py-3 border-b border-steel/50 hover:bg-asphalt/50 px-2 -mx-2 rounded-[2px] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "font-mono text-[9px] px-2 py-1 border rounded-[2px] uppercase",
                    lead.source === 'autotrader' ? "border-orange-500/20 text-orange-400 bg-orange-500/5" :
                    lead.source === 'ebay' ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                    "border-blue/20 text-blue bg-blue/5"
                  )}>
                    {lead.source}
                  </span>
                  <div>
                    <p className="font-inter font-medium text-[13px] text-cream group-hover:text-blue transition-colors">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="font-inter text-[12px] text-silver">
                      {(lead.vehicles as any) ? `${(lead.vehicles as any).make} ${(lead.vehicles as any).model}` : 'No vehicle'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "font-mono text-[9px] px-2 py-1 border rounded-[2px] uppercase",
                    lead.status === 'new' ? "border-blue/20 text-blue bg-blue/5" :
                    lead.status === 'won' ? "border-positive/20 text-positive bg-positive/5" :
                    lead.status === 'lost' ? "border-negative/20 text-negative bg-negative/5" :
                    "border-steel text-silver"
                  )}>
                    {lead.status}
                  </span>
                  <span className="font-mono text-[10px] text-pewter">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            )) : (
              <div className="py-12 text-center">
                <p className="font-inter text-sm text-pewter">No leads yet. They'll appear here as they come in.</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="xl:col-span-2 bg-carbon border border-steel rounded-[2px] p-6">
          <h2 className="font-syne font-bold text-base text-cream mb-5">Alerts</h2>
          <div className="space-y-2">
            {overage45.length > 0 && (
              <div className="bg-asphalt border-l-2 border-warning p-3 rounded-[2px]">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="font-syne font-bold text-[12px] text-cream">Price Review Due</p>
                    <p className="font-inter text-[11px] text-silver mt-0.5">
                      <span className="font-mono">{overage45.length}</span> vehicle{overage45.length > 1 ? 's' : ''} over 45 days on plot
                    </p>
                  </div>
                </div>
              </div>
            )}
            {data.leads48h > 0 && (
              <div className="bg-asphalt border-l-2 border-blue p-3 rounded-[2px]">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-blue mt-0.5 shrink-0" />
                  <div>
                    <p className="font-syne font-bold text-[12px] text-cream">New Leads Received</p>
                    <p className="font-inter text-[11px] text-silver mt-0.5">
                      <span className="font-mono">{data.leads48h}</span> new lead{data.leads48h > 1 ? 's' : ''} in the last 48 hours
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-asphalt border-l-2 border-blue p-3 rounded-[2px]">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-blue mt-0.5 shrink-0" />
                <div>
                  <p className="font-syne font-bold text-[12px] text-cream">Buying Signals Ready</p>
                  <p className="font-inter text-[11px] text-silver mt-0.5">
                    8 active buying recommendations in Command Centre
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-asphalt border-l-2 border-negative p-3 rounded-[2px]">
              <div className="flex items-start gap-2">
                <TrendingDown size={14} className="text-negative mt-0.5 shrink-0" />
                <div>
                  <p className="font-syne font-bold text-[12px] text-cream">Follow-ups Overdue</p>
                  <p className="font-inter text-[11px] text-silver mt-0.5">
                    3 leads with no contact in over 48 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buying Signals Preview */}
      <BuyingSignalsPreview signals={data.buyingSignals} />
    </div>
  )
}
