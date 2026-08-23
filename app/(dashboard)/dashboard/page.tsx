import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'
import { formatDistanceToNow, format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { 
  ArrowRight, 
  AlertTriangle, 
  Wrench, 
  Clock, 
  Plus, 
  Sparkles,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight
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
  const dealershipName = dealershipInfo?.name || 'Your Dealership'

  if (!dealershipId) return null

  const now = new Date()
  const twoDaysAgo = subDays(now, 2)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  // Real Database Queries (Parallelized)
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

  // Real Lead Pipeline Breakdown
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

  // Real Portal Listing and Provider Integrations
  const liveAdvertsCount = (portalListings || []).filter(l => l.status === 'live').length
  const pendingAdvertsCount = (portalListings || []).filter(l => l.status === 'update_pending').length

  const autotraderIntegration = integrations.find(i => i.id === 'autotrader')
  const xeroIntegration = integrations.find(i => i.id === 'xero')

  const autotraderStatusText = autotraderIntegration?.state.status === 'connected' 
    ? 'Connected' 
    : autotraderIntegration?.state.status === 'available'
    ? 'Credentials Configured'
    : 'Commercial Access Required'

  const xeroStatusText = xeroIntegration?.state.status === 'connected'
    ? 'Connected'
    : xeroIntegration?.state.status === 'available'
    ? 'Credentials Configured'
    : 'Not Configured'

  // Exceptions / Attention Vehicles
  const attentionVehicles = (activeVehicles || []).filter(v => {
    const days = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 60 || v.status === 'preparation'
  }).slice(0, 3)

  const activeBuyingSignals = buyingSignals.filter(s => s.status === 'new' || s.status === 'reviewed').slice(0, 2)
  const activePricingSignals = pricingSignals.filter(s => s.status === 'active').slice(0, 2)

  const hour = now.getHours()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-[1520px] mx-auto w-full space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Header: Calm Greeting & Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel/60 pb-5">
        <div>
          <h1 className="font-syne font-semibold text-2xl text-cream tracking-tight">
            {greeting}, {firstName}.
          </h1>
          <p className="font-inter text-[13px] text-silver mt-0.5">
            {dealershipName} · {format(now, 'EEEE d MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link href="/stock/preparation" className="flex items-center gap-1.5 font-inter text-xs">
              <Wrench size={13} className="text-pewter" />
              Prep board
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/stock/add" className="flex items-center gap-1.5 font-inter text-xs font-semibold">
              <Plus size={14} />
              Add vehicle
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Core Commercial Summary Strip (Connected Horizontal Metrics) */}
      <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 shadow-sm card-hover">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-steel/60">
          
          {/* Metric 1: Retail Stock */}
          <div className="pb-3 md:pb-0 md:pr-6">
            <p className="font-inter text-[12px] text-pewter font-medium mb-1">Retail stock on plot</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-cream tracking-tight">{kpis.totalRetailUnits}</span>
              <span className="font-inter text-xs text-silver">units</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1.5">
              {kpis.vehiclesInPreparation} in prep · {kpis.vehiclesReserved} reserved
            </p>
          </div>

          {/* Metric 2: Invested Capital */}
          <div className="py-3 md:py-0 md:px-6">
            <p className="font-inter text-[12px] text-pewter font-medium mb-1">Total capital invested</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-cream tracking-tight">{formatCurrency(kpis.totalStockValue)}</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1.5">
              Acquisition & preparation ledger
            </p>
          </div>

          {/* Metric 3: Potential Gross */}
          <div className="py-3 md:py-0 md:px-6">
            <p className="font-inter text-[12px] text-pewter font-medium mb-1">Potential gross margin</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-emerald-400 tracking-tight">{formatCurrency(kpis.potentialGrossMargin)}</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1.5">
              Avg {formatCurrency(kpis.averageGrossMargin)} / unit
            </p>
          </div>

          {/* Metric 4: Average Stock Age */}
          <div className="pt-3 md:pt-0 md:pl-6">
            <p className="font-inter text-[12px] text-pewter font-medium mb-1">Average stock age</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "font-mono font-bold text-3xl tracking-tight",
                kpis.averageDaysInStock < 30 ? "text-emerald-400" : kpis.averageDaysInStock < 45 ? "text-cream" : "text-amber-400"
              )}>
                {kpis.averageDaysInStock}
              </span>
              <span className="font-inter text-xs text-silver">days on plot</span>
            </div>
            <p className="font-inter text-[11px] text-pewter mt-1.5">
              {kpis.vehiclesOver45Days} units over 45 days
            </p>
          </div>

        </div>
      </div>

      {/* 3. Today's Focus & Deal Desk (Primary Operational Briefing) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Today's Focus (Actionable Operational Agenda) */}
        <div className="lg:col-span-7 bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-4 card-hover">
          <div className="flex items-center justify-between border-b border-steel/60 pb-3">
            <div>
              <h2 className="font-syne font-semibold text-base text-cream">Today's focus</h2>
              <p className="font-inter text-[12px] text-pewter">Active appointments, deadlines, and customer follow-ups</p>
            </div>
            <span className="font-mono text-[11px] text-pewter bg-asphalt px-2 py-0.5 rounded-[2px] border border-steel/60">
              {(todayAppointments?.length || 0) + (prepDueJobs?.length || 0) + (overdueLeads?.length || 0)} actions
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Appointments */}
            {todayAppointments && todayAppointments.length > 0 ? (
              todayAppointments.map(appt => (
                <div key={appt.id} className="flex items-start justify-between p-3 bg-asphalt/60 rounded-[2px] border border-steel/40 hover:border-steel transition-colors font-inter text-[13px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-semibold text-blue bg-blue/10 px-1.5 py-0.5 rounded-[2px]">
                        Appointment
                      </span>
                      <span className="font-medium text-cream">{appt.title}</span>
                    </div>
                    <p className="text-[12px] text-silver">
                      {appt.customers ? `${appt.customers.first_name} ${appt.customers.last_name}` : 'Customer'} · {appt.location || 'Showroom'}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-cream flex items-center gap-1 shrink-0 mt-0.5">
                    <Clock size={12} className="text-pewter" />
                    {format(new Date(appt.start_at), 'HH:mm')}
                  </span>
                </div>
              ))
            ) : null}

            {/* Preparation Deadlines Due */}
            {prepDueJobs && prepDueJobs.length > 0 ? (
              prepDueJobs.map(job => (
                <div key={job.id} className="flex items-start justify-between p-3 bg-asphalt/60 rounded-[2px] border border-steel/40 hover:border-steel transition-colors font-inter text-[13px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-[2px]">
                        Prep Deadline
                      </span>
                      <span className="font-medium text-cream">{job.title}</span>
                    </div>
                    <p className="text-[12px] text-silver">
                      {job.vehicles ? `${job.vehicles.make} ${job.vehicles.model} (${job.vehicles.registration})` : 'Vehicle'}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-amber-400 font-semibold uppercase shrink-0 mt-0.5">
                    {job.category}
                  </span>
                </div>
              ))
            ) : null}

            {/* Overdue Follow-ups (>48h SLA) */}
            {overdueLeads && overdueLeads.length > 0 ? (
              overdueLeads.slice(0, 2).map(lead => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-start justify-between p-3 bg-asphalt/60 rounded-[2px] border border-rose-500/30 hover:border-rose-500 transition-colors font-inter text-[13px] group">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-[2px]">
                        Overdue &gt;48h
                      </span>
                      <span className="font-medium text-cream group-hover:text-blue transition-colors">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </div>
                    <p className="text-[12px] text-silver">
                      {Array.isArray(lead.vehicles) ? lead.vehicles[0]?.make : (lead.vehicles as any)?.make || 'General enquiry'}
                    </p>
                  </div>
                  <span className="font-inter text-[12px] text-rose-400 flex items-center gap-1 shrink-0 mt-0.5">
                    Respond <ArrowRight size={12} />
                  </span>
                </Link>
              ))
            ) : null}

            {/* Clean Empty State */}
            {(!todayAppointments || todayAppointments.length === 0) &&
             (!prepDueJobs || prepDueJobs.length === 0) &&
             (!overdueLeads || overdueLeads.length === 0) && (
              <div className="py-8 text-center text-pewter font-inter text-xs">
                <CheckCircle2 size={22} className="mx-auto mb-2 text-emerald-400/60" />
                No urgent appointments or overdue actions required today.
              </div>
            )}
          </div>
        </div>

        {/* Deal Desk Summary */}
        <div className="lg:col-span-5 bg-carbon/90 border border-steel/80 rounded-[2px] p-5 flex flex-col justify-between space-y-4 card-hover">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-steel/60 pb-3">
              <div>
                <h2 className="font-syne font-semibold text-base text-cream">Deal desk</h2>
                <p className="font-inter text-[12px] text-pewter">Commercial deal pipeline and handovers</p>
              </div>
              <Link href="/deals" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
                Open Deal Desk <ArrowRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 font-inter">
              <div className="p-3 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <p className="text-[11px] text-pewter font-medium">Active in progress</p>
                <p className="font-mono font-bold text-2xl text-cream mt-0.5">{dealKpis.totalActive}</p>
              </div>

              <div className="p-3 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <p className="text-[11px] text-pewter font-medium">Deposits outstanding</p>
                <p className="font-mono font-bold text-2xl text-amber-400 mt-0.5">{dealKpis.depositsOutstanding}</p>
              </div>

              <div className="p-3 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <p className="text-[11px] text-pewter font-medium">Handovers this week</p>
                <p className="font-mono font-bold text-2xl text-blue mt-0.5">{dealKpis.handoversThisWeek}</p>
              </div>

              <div className="p-3 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <p className="text-[11px] text-pewter font-medium">Agreed & awaiting handover</p>
                <p className="font-mono font-bold text-2xl text-emerald-400 mt-0.5">{dealKpis.byStatus?.agreed || 0}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-steel/40">
            <Link 
              href="/deals/new" 
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-asphalt border border-steel/80 hover:border-blue text-cream text-[12px] font-inter font-medium rounded-[2px] transition-colors"
            >
              <Plus size={13} />
              Create new deal proposal
            </Link>
          </div>
        </div>

      </div>

      {/* 4. Stock Overview & Ageing Distribution (Consolidated Single Component) */}
      <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-4 card-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel/60 pb-3">
          <div>
            <h2 className="font-syne font-semibold text-base text-cream">Stock overview & ageing distribution</h2>
            <p className="font-inter text-[12px] text-pewter">{kpis.totalRetailUnits} vehicles in active inventory</p>
          </div>
          <Link href="/stock" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
            View full stockbook <ArrowRight size={12} />
          </Link>
        </div>

        {/* Ageing Bands Single Consolidated Bar */}
        <div className="space-y-2 font-inter text-[12px]">
          <div className="grid grid-cols-5 gap-2 text-center text-[11px] text-silver font-medium">
            <div>
              <span className="block text-pewter text-[10px]">0–30d</span>
              <span className="font-mono font-semibold text-emerald-400">{kpis.ageingBreakdown.under30}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">31–45d</span>
              <span className="font-mono font-semibold text-cream">{kpis.ageingBreakdown.days31to45}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">46–60d</span>
              <span className="font-mono font-semibold text-amber-400">{kpis.ageingBreakdown.days46to60}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">61–90d</span>
              <span className="font-mono font-semibold text-rose-400">{kpis.ageingBreakdown.days61to90}</span>
            </div>
            <div>
              <span className="block text-pewter text-[10px]">90d+</span>
              <span className="font-mono font-semibold text-rose-500">{kpis.ageingBreakdown.over90}</span>
            </div>
          </div>

          <div className="h-2 w-full bg-asphalt rounded-[2px] overflow-hidden flex">
            <div className="h-full bg-emerald-400" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.under30 / kpis.totalRetailUnits) * 100 : 0}%` }} title="0-30 days" />
            <div className="h-full bg-blue" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days31to45 / kpis.totalRetailUnits) * 100 : 0}%` }} title="31-45 days" />
            <div className="h-full bg-amber-400" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days46to60 / kpis.totalRetailUnits) * 100 : 0}%` }} title="46-60 days" />
            <div className="h-full bg-rose-400" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days61to90 / kpis.totalRetailUnits) * 100 : 0}%` }} title="61-90 days" />
            <div className="h-full bg-rose-600" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.over90 / kpis.totalRetailUnits) * 100 : 0}%` }} title="90+ days" />
          </div>
        </div>

        {/* Vehicles Needing Attention */}
        {attentionVehicles.length > 0 && (
          <div className="pt-3 border-t border-steel/40">
            <p className="font-inter text-[11px] text-pewter font-medium uppercase tracking-wider mb-2">
              Vehicles requiring attention
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-inter text-[12px]">
              {attentionVehicles.map(v => (
                <Link 
                  key={v.id} 
                  href={`/stock/${v.id}`}
                  className="p-2.5 bg-asphalt/60 border border-steel/40 rounded-[2px] hover:border-steel transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-cream truncate">{v.make} {v.model}</p>
                    <span className="font-mono text-[10px] text-silver">{v.registration}</span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded-[2px]">
                    {v.status === 'preparation' ? 'In Prep' : 'Ageing'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. IQ Commercial Intelligence Section (Phase 7 Grounded Signals) */}
      <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-4 card-hover">
        <div className="flex items-center justify-between border-b border-steel/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-blue" />
            <h2 className="font-syne font-semibold text-base text-cream">IQ Commercial Intelligence</h2>
          </div>
          <Link href="/command-centre" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
            Open Command Centre <ArrowRight size={12} />
          </Link>
        </div>

        {activeBuyingSignals.length === 0 && activePricingSignals.length === 0 ? (
          <p className="font-inter text-xs text-pewter py-4 text-center">
            No priority intelligence actions right now. Forecourt coverage is optimal.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-inter text-[13px]">
            {/* Top Buying Signal */}
            {activeBuyingSignals[0] && (
              <div className="p-3.5 bg-asphalt/60 border border-steel/50 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold flex items-center gap-1">
                    <ShoppingBag size={12} /> Acquisition Opportunity
                  </span>
                  <Link href="/intelligence/buying" className="text-[11px] text-blue hover:underline flex items-center gap-0.5">
                    Review <ArrowUpRight size={11} />
                  </Link>
                </div>
                <p className="font-semibold text-cream">
                  {activeBuyingSignals[0].make} {activeBuyingSignals[0].model} {activeBuyingSignals[0].variant}
                </p>
                <p className="text-[12px] text-silver">
                  Stock gap detected: Zero forecourt units with active website search demand. Target buy {formatCurrency(activeBuyingSignals[0].target_buy_price || 0)}.
                </p>
              </div>
            )}

            {/* Top Pricing Signal */}
            {activePricingSignals[0] && (
              <div className="p-3.5 bg-asphalt/60 border border-steel/50 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold flex items-center gap-1">
                    <Tag size={12} /> Pricing Attention
                  </span>
                  <Link href="/intelligence/pricing" className="text-[11px] text-blue hover:underline flex items-center gap-0.5">
                    Review <ArrowUpRight size={11} />
                  </Link>
                </div>
                <p className="font-semibold text-cream">
                  {activePricingSignals[0].vehicle_summary?.make} {activePricingSignals[0].vehicle_summary?.model} ({activePricingSignals[0].vehicle_summary?.registration})
                </p>
                <p className="text-[12px] text-silver">
                  {activePricingSignals[0].reason_summary} Suggested: {formatCurrency(activePricingSignals[0].recommended_price || 0)}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Customer Enquiries & Lead Pipeline & Advertising Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Enquiries (7 cols) */}
        <div className="lg:col-span-7 bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
          <div className="flex items-center justify-between border-b border-steel/60 pb-3">
            <div>
              <h2 className="font-syne font-semibold text-base text-cream">Recent customer enquiries</h2>
              <p className="font-inter text-[12px] text-pewter">Direct website and portal customer leads</p>
            </div>
            <Link href="/leads" className="font-inter text-xs text-blue hover:underline flex items-center gap-1">
              View all leads <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-1 divide-y divide-steel/40">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-asphalt/60 rounded-[2px] transition-colors group font-inter text-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] px-2 py-0.5 border border-steel/60 text-silver bg-asphalt rounded-[2px] uppercase">
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-pewter">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="font-inter text-xs text-pewter py-6 text-center">No customer leads recorded yet.</p>
            )}
          </div>
        </div>

        {/* Lead Funnel Chart & Advertising Feeds (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Lead Pipeline Funnel */}
          <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover">
            <div className="flex items-center justify-between border-b border-steel/60 pb-2">
              <h2 className="font-syne font-semibold text-base text-cream">Lead pipeline</h2>
              <span className="font-mono text-[10px] text-pewter">
                {allLeadsForPipeline?.length || 0} TOTAL
              </span>
            </div>
            <LeadPipelineChart pipelineData={leadPipelineData} />
          </div>

          {/* Advertising & Live Feeds (Truthful Integration State) */}
          <div className="bg-carbon/90 border border-steel/80 rounded-[2px] p-5 space-y-3 card-hover font-inter text-[13px]">
            <div className="flex items-center justify-between border-b border-steel/60 pb-2">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-blue" />
                <h2 className="font-syne font-semibold text-base text-cream">Advertising & integrations</h2>
              </div>
              <Link href="/advertising" className="text-xs text-blue hover:underline flex items-center gap-1">
                Feeds <ArrowRight size={11} />
              </Link>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <span className="text-silver">Live portal adverts</span>
                <span className="font-mono font-semibold text-emerald-400">{liveAdvertsCount}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <span className="text-silver">AutoTrader Connect</span>
                <span className="font-mono text-[11px] text-pewter">{autotraderStatusText}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-asphalt/60 rounded-[2px] border border-steel/40">
                <span className="text-silver">Accounting (Xero)</span>
                <span className="font-mono text-[11px] text-pewter">{xeroStatusText}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
