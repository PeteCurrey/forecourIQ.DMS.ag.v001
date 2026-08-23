import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'
import { formatDistanceToNow, format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { 
  ArrowRight, 
  Wrench, 
  Clock, 
  Plus, 
  ShoppingBag, 
  Tag, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  ArrowUpRight,
  AlertCircle
} from 'lucide-react'
import LeadPipelineChart from '@/components/dashboard/dashboard-charts'
import { VehicleService } from '@/lib/services/vehicle'
import { DealService } from '@/lib/services/deal'
import { IntegrationService } from '@/lib/services/integrations/integration-service'
import { BuyingService } from '@/lib/services/intelligence/buying-service'
import { PricingService } from '@/lib/services/intelligence/pricing-service'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Management Dashboard | ForecourIQ DMS',
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
  const dealershipInfo = profile?.dealerships as { name?: string; city?: string } | null
  const dealershipName = dealershipInfo?.name || 'Hartwell Motor Group'

  if (!dealershipId) return null

  const now = new Date()
  const twoDaysAgo = subDays(now, 2)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  // Real Database Queries
  const [
    kpis,
    dealKpis,
    { data: activeVehicles },
    { data: todayAppointments },
    { data: todayTasks },
    { data: prepDueJobs },
    { data: overdueLeads },
    { data: recentLeads },
    { data: allLeadsForPipeline },
    buyingSignals,
    pricingSignals,
    { data: portalListings },
    integrations,
  ] = await Promise.all([
    VehicleService.getStockKPIs(dealershipId),
    DealService.getKPIs(dealershipId),
    supabase.from('vehicles').select('id, make, model, variant, registration, asking_price, purchase_price, prep_cost, status, created_at').eq('dealership_id', dealershipId).not('status', 'in', '("sold","completed","archived")'),
    supabase.from('appointments').select('*, vehicles(registration, make, model), customers(first_name, last_name)').eq('dealership_id', dealershipId).gte('start_at', todayStart).lte('start_at', todayEnd).order('start_at', { ascending: true }),
    supabase.from('tasks').select('*').eq('dealership_id', dealershipId).eq('status', 'open').lte('due_at', todayEnd).order('due_at', { ascending: true }),
    supabase.from('preparation_jobs').select('*, vehicles(registration, make, model)').eq('dealership_id', dealershipId).neq('status', 'completed').neq('status', 'cancelled').lte('due_date', now.toISOString().split('T')[0]),
    supabase.from('leads').select('id, first_name, last_name, status, created_at, vehicles(make, model, registration)').eq('dealership_id', dealershipId).in('status', ['new', 'contacted']).lt('created_at', twoDaysAgo.toISOString()),
    supabase.from('leads').select('*, vehicles(make, model, registration)').eq('dealership_id', dealershipId).order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('status').eq('dealership_id', dealershipId),
    BuyingService.getBuyingSignals(dealershipId),
    PricingService.getPricingSignals(dealershipId),
    supabase.from('portal_listings').select('status').eq('dealership_id', dealershipId),
    IntegrationService.listForDealership(dealershipId),
  ])

  // Lead Pipeline Breakdown
  const pipelineCounts: Record<string, number> = {
    'New': 0,
    'Contacted': 0,
    'Test Drive': 0,
    'Offer': 0,
    'Won': 0,
    'Lost': 0,
  }
  for (const l of allLeadsForPipeline || []) {
    if (l.status === 'new' || l.status === 'unassigned') pipelineCounts['New']++
    else if (l.status === 'contacted') pipelineCounts['Contacted']++
    else if (l.status === 'viewing_booked' || l.status === 'test_drive') pipelineCounts['Test Drive']++
    else if (l.status === 'negotiation' || l.status === 'offer') pipelineCounts['Offer']++
    else if (l.status === 'won' || l.status === 'deposit_paid') pipelineCounts['Won']++
    else if (l.status === 'lost') pipelineCounts['Lost']++
  }
  const leadPipelineData = [
    { name: 'New', count: pipelineCounts['New'] },
    { name: 'Contacted', count: pipelineCounts['Contacted'] },
    { name: 'Test Drive', count: pipelineCounts['Test Drive'] },
    { name: 'Offer', count: pipelineCounts['Offer'] },
    { name: 'Won', count: pipelineCounts['Won'] },
    { name: 'Lost', count: pipelineCounts['Lost'] },
  ]

  // Integration Status
  const liveAdvertsCount = (portalListings || []).filter(l => l.status === 'live').length
  const autotraderIntegration = integrations.find(i => i.id === 'autotrader')
  const xeroIntegration = integrations.find(i => i.id === 'xero')

  const autotraderConnected = autotraderIntegration?.state.status === 'connected'
  const xeroConnected = xeroIntegration?.state.status === 'connected'

  // Exceptions / Attention Vehicles (sorted by oldest/prep)
  const attentionVehicles = (activeVehicles || []).filter(v => {
    const days = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 45 || v.status === 'preparation' || !v.asking_price
  }).slice(0, 4)

  const activeBuyingSignals = buyingSignals.filter(s => s.status === 'new' || s.status === 'reviewed').slice(0, 2)
  const activePricingSignals = pricingSignals.filter(s => s.status === 'active').slice(0, 2)

  const hour = now.getHours()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-[1480px] mx-auto w-full space-y-8 pb-20">
      
      {/* 1. Header (reveal-1): Calm Editorial Greeting */}
      <div className="reveal-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel/60 pb-5">
        <div>
          <h1 className="font-syne-title text-2xl text-cream tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="font-inter text-xs text-silver mt-0.5">
            {dealershipName} · {format(now, 'EEEE d MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/stock/preparation" className="flex items-center gap-1.5 font-inter text-xs">
              <Wrench size={13} className="text-pewter" />
              Prep board
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/stock/add" className="flex items-center gap-1.5 font-inter text-xs font-semibold">
              <Plus size={13} />
              Add vehicle
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Commercial Summary Strip (reveal-2): Connected Metrics directly on subtle surface */}
      <div className="reveal-2 bg-carbon border border-steel rounded-[2px] p-5 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-steel">
          
          {/* Metric 1: Retail Stock */}
          <div className="pb-3 md:pb-0 md:pr-6">
            <p className="font-inter text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">Retail stock</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-2xl text-cream tracking-tight">{kpis.totalRetailUnits}</span>
              <span className="font-inter text-xs text-silver">units</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1">
              {kpis.vehiclesInPreparation} in prep · {kpis.vehiclesReserved} reserved
            </p>
          </div>

          {/* Metric 2: Invested Capital */}
          <div className="py-3 md:py-0 md:px-6">
            <p className="font-inter text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">Capital invested</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-2xl text-cream tracking-tight">{formatCurrency(kpis.totalStockValue)}</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1">
              Acquisition & preparation ledger
            </p>
          </div>

          {/* Metric 3: Potential Gross */}
          <div className="py-3 md:py-0 md:px-6">
            <p className="font-inter text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">Potential gross</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-2xl text-positive tracking-tight">{formatCurrency(kpis.potentialGrossMargin)}</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1">
              Avg {formatCurrency(kpis.averageGrossMargin)} / unit
            </p>
          </div>

          {/* Metric 4: Average Stock Age */}
          <div className="pt-3 md:pt-0 md:pl-6">
            <p className="font-inter text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">Average stock age</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "font-mono font-bold text-2xl tracking-tight",
                kpis.averageDaysInStock < 30 ? "text-positive" : kpis.averageDaysInStock < 45 ? "text-cream" : "text-warning"
              )}>
                {kpis.averageDaysInStock}
              </span>
              <span className="font-inter text-xs text-silver">days</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1">
              {kpis.vehiclesOver45Days} units over 45 days
            </p>
          </div>

        </div>
      </div>

      {/* 3. Primary Operational Focus: Today's Agenda + Deal Desk (reveal-3) */}
      <div className="reveal-3 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Today's Focus (7 cols): Clean Agenda Rows */}
        <div className="lg:col-span-7 bg-carbon border border-steel rounded-[2px] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-steel pb-3">
            <div>
              <h2 className="font-inter font-semibold text-sm text-cream">Today's focus</h2>
              <p className="font-inter text-xs text-pewter">Scheduled appointments, prep deadlines, and customer SLAs</p>
            </div>
            <span className="font-mono text-[10px] text-pewter bg-asphalt px-2 py-0.5 rounded-[2px]">
              {(todayAppointments?.length || 0) + (prepDueJobs?.length || 0) + (overdueLeads?.length || 0)} ACTIONS
            </span>
          </div>

          <div className="divide-y divide-steel/60">
            
            {/* Overdue Items (Priority 1) */}
            {overdueLeads && overdueLeads.length > 0 && (
              overdueLeads.slice(0, 2).map(lead => (
                <Link 
                  key={lead.id} 
                  href={`/leads/${lead.id}`}
                  className="py-2.5 flex items-center justify-between group row-hover -mx-2 px-2 rounded-[2px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase font-semibold text-negative bg-negative/10 px-1.5 py-0.2 rounded-[2px]">
                        Overdue SLA
                      </span>
                      <span className="font-inter font-medium text-xs text-cream group-hover:text-blue transition-colors">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-silver">
                      {Array.isArray(lead.vehicles) ? lead.vehicles[0]?.make : (lead.vehicles as any)?.make || 'General enquiry'}
                    </p>
                  </div>
                  <span className="font-inter text-xs text-negative flex items-center gap-1 shrink-0">
                    Respond <ArrowRight size={11} />
                  </span>
                </Link>
              ))
            )}

            {/* Appointments Today (Priority 2) */}
            {todayAppointments && todayAppointments.length > 0 && (
              todayAppointments.map(appt => (
                <div 
                  key={appt.id} 
                  className="py-2.5 flex items-center justify-between row-hover -mx-2 px-2 rounded-[2px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase font-semibold text-blue bg-blue/10 px-1.5 py-0.2 rounded-[2px]">
                        Appointment
                      </span>
                      <span className="font-inter font-medium text-xs text-cream">
                        {appt.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-silver">
                      {appt.customers ? `${appt.customers.first_name} ${appt.customers.last_name}` : 'Customer'} · {appt.location || 'Showroom'}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-cream flex items-center gap-1 shrink-0">
                    <Clock size={11} className="text-pewter" />
                    {format(new Date(appt.start_at), 'HH:mm')}
                  </span>
                </div>
              ))
            )}

            {/* Preparation Deadlines (Priority 3) */}
            {prepDueJobs && prepDueJobs.length > 0 && (
              prepDueJobs.map(job => (
                <div 
                  key={job.id} 
                  className="py-2.5 flex items-center justify-between row-hover -mx-2 px-2 rounded-[2px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase font-semibold text-warning bg-warning/10 px-1.5 py-0.2 rounded-[2px]">
                        Prep Due
                      </span>
                      <span className="font-inter font-medium text-xs text-cream">
                        {job.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-silver">
                      {job.vehicles ? `${job.vehicles.make} ${job.vehicles.model} (${job.vehicles.registration})` : 'Vehicle'}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-warning uppercase font-medium">
                    {job.category}
                  </span>
                </div>
              ))
            )}

            {/* Empty State */}
            {(!todayAppointments || todayAppointments.length === 0) &&
             (!prepDueJobs || prepDueJobs.length === 0) &&
             (!overdueLeads || overdueLeads.length === 0) && (
              <div className="py-8 text-center text-pewter font-inter text-xs">
                <CheckCircle2 size={20} className="mx-auto mb-1.5 text-positive/60" />
                No pending customer follow-ups or appointments today.
              </div>
            )}

          </div>
        </div>

        {/* Deal Desk Summary (5 cols): Financial Flow Lines */}
        <div className="lg:col-span-5 bg-carbon border border-steel rounded-[2px] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-steel pb-3">
              <div>
                <h2 className="font-inter font-semibold text-sm text-cream">Deal desk</h2>
                <p className="font-inter text-xs text-pewter">Commercial deal pipeline and handovers</p>
              </div>
              <Link href="/deals" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
                Open Deal Desk <ArrowRight size={11} />
              </Link>
            </div>

            <div className="space-y-2 font-inter text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-steel/40">
                <span className="text-silver">Active proposals in progress</span>
                <span className="font-mono font-semibold text-cream">{dealKpis.totalActive}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-steel/40">
                <span className="text-silver">Deposits outstanding</span>
                <span className="font-mono font-semibold text-warning">{dealKpis.depositsOutstanding}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-steel/40">
                <span className="text-silver">Scheduled handovers this week</span>
                <span className="font-mono font-semibold text-blue">{dealKpis.handoversThisWeek}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-silver">Agreed & awaiting handover</span>
                <span className="font-mono font-semibold text-positive">{dealKpis.byStatus?.agreed || 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-steel">
            <Link 
              href="/deals/new" 
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-asphalt border border-steel hover:border-slate text-cream text-xs font-inter font-medium rounded-[2px] transition-colors"
            >
              <Plus size={12} />
              Create deal proposal
            </Link>
          </div>
        </div>

      </div>

      {/* 4. Stock & Ageing Management (reveal-4): Thin Ageing Strip + Compact Exceptions Table */}
      <div className="reveal-4 bg-carbon border border-steel rounded-[2px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel pb-3">
          <div>
            <h2 className="font-inter font-semibold text-sm text-cream">Stock</h2>
            <p className="font-inter text-xs text-pewter">{kpis.totalRetailUnits} retail units · {formatCurrency(kpis.totalStockValue)} capital invested</p>
          </div>
          <Link href="/stock" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
            View full stockbook <ArrowRight size={11} />
          </Link>
        </div>

        {/* Age Profile Horizontal Distribution */}
        <div className="space-y-1.5 font-inter text-xs">
          <div className="grid grid-cols-5 gap-2 text-center text-[11px] text-silver">
            <div>
              <span className="block text-pewter text-[10px]">0–30d</span>
              <span className="font-mono font-semibold text-positive">{kpis.ageingBreakdown.under30}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">31–45d</span>
              <span className="font-mono font-semibold text-cream">{kpis.ageingBreakdown.days31to45}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">46–60d</span>
              <span className="font-mono font-semibold text-warning">{kpis.ageingBreakdown.days46to60}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">61–90d</span>
              <span className="font-mono font-semibold text-negative">{kpis.ageingBreakdown.days61to90}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">90d+</span>
              <span className="font-mono font-semibold text-negative font-bold">{kpis.ageingBreakdown.over90}</span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-asphalt rounded-[2px] overflow-hidden flex">
            <div className="h-full bg-positive" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.under30 / kpis.totalRetailUnits) * 100 : 0}%` }} title="0-30 days" />
            <div className="h-full bg-blue" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days31to45 / kpis.totalRetailUnits) * 100 : 0}%` }} title="31-45 days" />
            <div className="h-full bg-warning" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days46to60 / kpis.totalRetailUnits) * 100 : 0}%` }} title="46-60 days" />
            <div className="h-full bg-negative" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days61to90 / kpis.totalRetailUnits) * 100 : 0}%` }} title="61-90 days" />
            <div className="h-full bg-red-700" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.over90 / kpis.totalRetailUnits) * 100 : 0}%` }} title="90+ days" />
          </div>
        </div>

        {/* Compact Attention List */}
        {attentionVehicles.length > 0 && (
          <div className="pt-2">
            <p className="font-inter text-[11px] text-pewter font-medium uppercase tracking-wider mb-2">
              Vehicles requiring attention
            </p>
            <div className="divide-y divide-steel/60 font-inter text-xs">
              {attentionVehicles.map(v => {
                const days = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <Link 
                    key={v.id} 
                    href={`/stock/${v.id}`}
                    className="py-2 flex items-center justify-between row-hover -mx-2 px-2 rounded-[2px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-cream bg-asphalt px-1.5 py-0.5 rounded-[2px] font-semibold">
                        {v.registration}
                      </span>
                      <span className="font-medium text-cream">{v.make} {v.model} {v.variant || ''}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-mono text-[10px] uppercase font-semibold",
                        v.status === 'preparation' ? "text-warning" : "text-negative"
                      )}>
                        {v.status === 'preparation' ? 'In prep' : `${days}d in stock`}
                      </span>
                      <span className="font-mono text-xs text-silver">
                        {v.asking_price ? formatCurrency(v.asking_price) : 'No Price'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. IQ Intelligence Feed (reveal-5): Calm Editorial Intelligence Briefing */}
      <div className="reveal-5 bg-carbon border border-steel rounded-[2px] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-steel pb-3">
          <div>
            <h2 className="font-inter font-semibold text-sm text-cream">IQ commercial intelligence</h2>
            <p className="font-inter text-xs text-pewter">Live demand, buying opportunities, and inventory pricing signals</p>
          </div>
          <Link href="/command-centre" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
            Open Command Centre <ArrowRight size={11} />
          </Link>
        </div>

        {activeBuyingSignals.length === 0 && activePricingSignals.length === 0 ? (
          <p className="font-inter text-xs text-pewter py-3 text-center">
            No active intelligence flags. Forecourt inventory aligned with demand.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-inter text-xs">
            {/* Top Buying Signal */}
            {activeBuyingSignals[0] && (
              <div className="p-3 bg-asphalt/60 border border-steel/60 rounded-[2px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-positive uppercase font-semibold">
                    Buying Opportunity
                  </span>
                  <Link href="/intelligence/buying" className="text-blue hover:underline flex items-center gap-0.5 text-[11px]">
                    Review <ArrowUpRight size={11} />
                  </Link>
                </div>
                <p className="font-medium text-cream">
                  {activeBuyingSignals[0].make} {activeBuyingSignals[0].model} {activeBuyingSignals[0].variant}
                </p>
                <p className="text-silver text-[11px] leading-relaxed">
                  Stock gap: zero units on plot with strong active search demand. Target buy {formatCurrency(activeBuyingSignals[0].target_buy_price || 0)}.
                </p>
              </div>
            )}

            {/* Top Pricing Signal */}
            {activePricingSignals[0] && (
              <div className="p-3 bg-asphalt/60 border border-steel/60 rounded-[2px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-warning uppercase font-semibold">
                    Pricing Attention
                  </span>
                  <Link href="/intelligence/pricing" className="text-blue hover:underline flex items-center gap-0.5 text-[11px]">
                    Review <ArrowUpRight size={11} />
                  </Link>
                </div>
                <p className="font-medium text-cream">
                  {activePricingSignals[0].vehicle_summary?.make} {activePricingSignals[0].vehicle_summary?.model} ({activePricingSignals[0].vehicle_summary?.registration})
                </p>
                <p className="text-silver text-[11px] leading-relaxed">
                  {activePricingSignals[0].reason_summary} Suggested asking price: {formatCurrency(activePricingSignals[0].recommended_price || 0)}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Secondary Information (reveal-6): Lead Pipeline Funnel & Customer Enquiries */}
      <div className="reveal-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Customer Enquiries (7 cols) */}
        <div className="lg:col-span-7 bg-carbon border border-steel rounded-[2px] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-steel pb-3">
            <div>
              <h2 className="font-inter font-semibold text-sm text-cream">Recent customer enquiries</h2>
              <p className="font-inter text-xs text-pewter">Direct website and portal customer enquiries</p>
            </div>
            <Link href="/leads" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
              View all leads <ArrowRight size={11} />
            </Link>
          </div>

          <div className="divide-y divide-steel/60">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="py-2 flex items-center justify-between row-hover -mx-2 px-2 rounded-[2px] font-inter text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[9px] px-1.5 py-0.2 border border-steel text-silver bg-asphalt rounded-[2px] uppercase">
                      {lead.source}
                    </span>
                    <div>
                      <p className="font-medium text-cream group-hover:text-blue transition-colors">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-[11px] text-silver">
                        {Array.isArray(lead.vehicles) ? (lead.vehicles[0] ? `${lead.vehicles[0].make} ${lead.vehicles[0].model}` : 'General enquiry') : (lead.vehicles ? `${(lead.vehicles as any).make} ${(lead.vehicles as any).model}` : 'General enquiry')}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-pewter">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </span>
                </Link>
              ))
            ) : (
              <p className="font-inter text-xs text-pewter py-6 text-center">No customer leads recorded yet.</p>
            )}
          </div>
        </div>

        {/* Lead Funnel Chart & System Attention (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Lead Pipeline Funnel */}
          <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-steel pb-2">
              <h2 className="font-inter font-semibold text-sm text-cream">Lead pipeline</h2>
              <span className="font-mono text-[10px] text-pewter">
                {allLeadsForPipeline?.length || 0} TOTAL
              </span>
            </div>
            <LeadPipelineChart pipelineData={leadPipelineData} />
          </div>

          {/* System & Advertising Health (Clean, understated) */}
          <div className="bg-carbon border border-steel rounded-[2px] p-4 space-y-2 font-inter text-xs">
            <div className="flex items-center justify-between border-b border-steel/60 pb-2">
              <span className="font-medium text-cream">Advertising & Feeds</span>
              <span className="font-mono text-[10px] text-positive font-semibold">
                {liveAdvertsCount} LIVE
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-[11px]">
              <div className="flex justify-between text-silver">
                <span>AutoTrader Connect</span>
                <span className="font-mono text-pewter">{autotraderConnected ? 'Connected' : 'Access Required'}</span>
              </div>
              <div className="flex justify-between text-silver">
                <span>Xero Accounting</span>
                <span className="font-mono text-pewter">{xeroConnected ? 'Connected' : 'Not Configured'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
