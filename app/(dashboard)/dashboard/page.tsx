import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatRegistration } from '@/lib/format'
import { formatDistanceToNow, format, subDays, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { 
  ArrowRight, 
  AlertTriangle, 
  Info, 
  TrendingDown, 
  Calendar, 
  CheckSquare, 
  Wrench, 
  Clock, 
  Car, 
  PoundSterling,
  Plus,
  Handshake
} from 'lucide-react'
import DashboardCharts from '@/components/dashboard/dashboard-charts'
import BuyingSignalsPreview from '@/components/dashboard/buying-signals-preview'
import { VehicleService } from '@/lib/services/vehicle'
import { DealService } from '@/lib/services/deal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    { data: buyingSignals },
  ] = await Promise.all([
    VehicleService.getStockKPIs(dealershipId),
    DealService.getKPIs(dealershipId),
    supabase.from('vehicles').select('*').eq('dealership_id', dealershipId).not('status', 'in', '("sold","completed","archived")'),
    supabase.from('appointments').select('*, vehicles(registration, make, model), customers(first_name, last_name)').eq('dealership_id', dealershipId).gte('start_at', todayStart).lte('start_at', todayEnd).order('start_at', { ascending: true }),
    supabase.from('tasks').select('*').eq('dealership_id', dealershipId).eq('status', 'open').lte('due_at', todayEnd).order('due_at', { ascending: true }),
    supabase.from('preparation_jobs').select('*, vehicles(registration, make, model)').eq('dealership_id', dealershipId).neq('status', 'completed').neq('status', 'cancelled').lte('due_date', now.toISOString().split('T')[0]),
    supabase.from('leads').select('id, first_name, last_name, status, created_at, vehicles(make, model, registration)').eq('dealership_id', dealershipId).in('status', ['new', 'contacted']).lt('created_at', twoDaysAgo.toISOString()),
    supabase.from('leads').select('*, vehicles(make, model, registration)').eq('dealership_id', dealershipId).order('created_at', { ascending: false }).limit(6),
    supabase.from('buying_signals').select('*').eq('dealership_id', dealershipId).eq('status', 'active').order('demand_score', { ascending: false }).limit(3),
  ])

  const hour = now.getHours()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne font-bold text-[32px] text-cream tracking-tight">
            {greeting}, {firstName}.
          </h1>
          <p className="font-inter text-sm text-silver mt-1">
            {dealershipName} · {format(now, 'EEEE d MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/stock/preparation">
              <Wrench size={14} /> PREP BOARD
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/stock/add">
              <Plus size={15} /> ADD VEHICLE
            </Link>
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid (All Real Data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Retail Units */}
        <div className="bg-carbon border border-steel rounded-[2px] p-5">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-widest mb-3">Retail Stock on Plot</p>
          <p className="font-mono font-bold text-4xl text-cream mb-1">{kpis.totalRetailUnits}</p>
          <p className="font-mono text-[11px] text-silver">
            {kpis.vehiclesInPreparation} in prep · {kpis.vehiclesReserved} reserved
          </p>
        </div>

        {/* Invested Capital */}
        <div className="bg-carbon border border-steel rounded-[2px] p-5">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-widest mb-3">Total Invested Cost</p>
          <p className="font-mono font-bold text-4xl text-cream mb-1">{formatCurrency(kpis.totalStockValue)}</p>
          <p className="font-mono text-[11px] text-silver">Acquisition + Prep Ledger</p>
        </div>

        {/* Potential Gross Margin */}
        <div className="bg-carbon border border-steel rounded-[2px] p-5">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-widest mb-3">Potential Gross Margin</p>
          <p className="font-mono font-bold text-4xl text-positive mb-1">{formatCurrency(kpis.potentialGrossMargin)}</p>
          <p className="font-mono text-[11px] text-silver">
            Avg {formatCurrency(kpis.averageGrossMargin)} / unit
          </p>
        </div>

        {/* Velocity & Aging */}
        <div className="bg-carbon border border-steel rounded-[2px] p-5">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-widest mb-3">Forecourt Velocity</p>
          <p className={cn(
            "font-mono font-bold text-4xl mb-1",
            kpis.averageDaysInStock < 30 ? "text-positive" : kpis.averageDaysInStock < 45 ? "text-cream" : "text-warning"
          )}>
            {kpis.averageDaysInStock} <span className="text-base font-normal text-silver">days avg</span>
          </p>
          <p className="font-mono text-[11px] text-silver">
            {kpis.vehiclesOver45Days} units &gt;45 days
          </p>
        </div>

      </div>

      {/* DEAL DESK COMMERCIAL PIPELINE */}
      <div className="bg-carbon border border-steel rounded-[2px] p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-steel">
          <div className="flex items-center gap-2">
            <Handshake size={18} className="text-blue" />
            <h2 className="font-syne font-bold text-base text-cream">DEAL DESK PIPELINE</h2>
          </div>
          <Link href="/deals" className="text-xs text-blue hover:underline font-mono flex items-center gap-1">
            OPEN DEAL DESK <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-asphalt p-3 rounded-[2px] border border-steel">
            <span className="text-pewter uppercase text-[10px] block">Active Deals in Progress</span>
            <span className="text-xl font-bold text-cream">{dealKpis.totalActive}</span>
          </div>

          <div className="bg-asphalt p-3 rounded-[2px] border border-steel">
            <span className="text-pewter uppercase text-[10px] block">Deposits Outstanding</span>
            <span className="text-xl font-bold text-warning">{dealKpis.depositsOutstanding}</span>
          </div>

          <div className="bg-asphalt p-3 rounded-[2px] border border-steel">
            <span className="text-pewter uppercase text-[10px] block">Deliveries / Handovers 7D</span>
            <span className="text-xl font-bold text-blue">{dealKpis.handoversThisWeek}</span>
          </div>

          <div className="bg-asphalt p-3 rounded-[2px] border border-steel">
            <span className="text-pewter uppercase text-[10px] block">Agreed & Awaiting Delivery</span>
            <span className="text-xl font-bold text-positive">{dealKpis.byStatus?.agreed || 0}</span>
          </div>
        </div>
      </div>

      {/* TODAY OPERATIONAL AGENDA & WORKFLOW */}
      <div className="bg-carbon border border-steel rounded-[2px] p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-steel">
          <div className="flex items-center gap-3">
            <h2 className="font-syne font-bold text-lg text-cream flex items-center gap-2">
              <Calendar size={18} className="text-blue" /> TODAY'S OPERATIONAL AGENDA
            </h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              {(todayAppointments?.length || 0) + (todayTasks?.length || 0) + (prepDueJobs?.length || 0)} ACTIONS
            </Badge>
          </div>
          <span className="font-mono text-xs text-silver">{format(now, 'dd MMM yyyy')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Appointments Column */}
          <div className="space-y-3">
            <p className="font-mono text-[11px] text-pewter uppercase tracking-wider flex items-center justify-between">
              <span>Viewings & Handovers</span>
              <span className="text-cream">{todayAppointments?.length || 0}</span>
            </p>
            <div className="space-y-2">
              {todayAppointments && todayAppointments.length > 0 ? (
                todayAppointments.map(appt => (
                  <div key={appt.id} className="p-3 bg-asphalt border border-steel rounded-[2px]">
                    <p className="font-inter font-medium text-xs text-cream">{appt.title}</p>
                    <p className="font-mono text-[10px] text-silver mt-1 flex items-center gap-1">
                      <Clock size={11} /> {format(new Date(appt.start_at), 'HH:mm')} · {appt.location || 'Forecourt'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="font-inter text-xs text-pewter py-3">No appointments scheduled for today.</p>
              )}
            </div>
          </div>

          {/* Prep Due Column */}
          <div className="space-y-3">
            <p className="font-mono text-[11px] text-pewter uppercase tracking-wider flex items-center justify-between">
              <span>Preparation Jobs Due</span>
              <span className="text-cream">{prepDueJobs?.length || 0}</span>
            </p>
            <div className="space-y-2">
              {prepDueJobs && prepDueJobs.length > 0 ? (
                prepDueJobs.map(job => (
                  <div key={job.id} className="p-3 bg-asphalt border border-steel rounded-[2px]">
                    <p className="font-inter font-medium text-xs text-cream">{job.title}</p>
                    <div className="flex items-center justify-between mt-1 font-mono text-[10px]">
                      <span className="text-silver">{job.vehicles?.registration || 'Vehicle'}</span>
                      <span className="text-warning font-bold uppercase">{job.category}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-inter text-xs text-pewter py-3">No prep deadlines due today.</p>
              )}
            </div>
          </div>

          {/* Overdue Leads & Follow-ups Column */}
          <div className="space-y-3">
            <p className="font-mono text-[11px] text-pewter uppercase tracking-wider flex items-center justify-between">
              <span>Overdue Follow-ups</span>
              <span className={cn(overdueLeads && overdueLeads.length > 0 ? "text-negative font-bold" : "text-cream")}>
                {overdueLeads?.length || 0}
              </span>
            </p>
            <div className="space-y-2">
              {overdueLeads && overdueLeads.length > 0 ? (
                overdueLeads.slice(0, 3).map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="p-3 bg-asphalt border border-negative/30 rounded-[2px] block hover:border-negative transition-colors">
                    <p className="font-inter font-medium text-xs text-cream">{lead.first_name} {lead.last_name}</p>
                    <p className="font-mono text-[10px] text-negative mt-0.5">
                      No contact in &gt;48h · {Array.isArray(lead.vehicles) ? lead.vehicles[0]?.make : (lead.vehicles as any)?.make || 'Enquiry'}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="font-inter text-xs text-pewter py-3">All leads contacted within 48h SLA.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Stock Ageing Breakdown & Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Stock Ageing Bands */}
        <div className="lg:col-span-2 bg-carbon border border-steel rounded-[2px] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-syne font-bold text-base text-cream">Stock Ageing Distribution</h2>
            <span className="font-mono text-xs text-silver">{kpis.totalRetailUnits} units</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-silver mb-1">
                <span>0 – 30 Days (Fresh Stock):</span>
                <span className="text-positive font-bold">{kpis.ageingBreakdown.under30} units</span>
              </div>
              <div className="h-1.5 w-full bg-asphalt rounded-full overflow-hidden">
                <div className="h-full bg-positive" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.under30 / kpis.totalRetailUnits) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-silver mb-1">
                <span>31 – 45 Days (Optimal Velocity):</span>
                <span className="text-cream">{kpis.ageingBreakdown.days31to45} units</span>
              </div>
              <div className="h-1.5 w-full bg-asphalt rounded-full overflow-hidden">
                <div className="h-full bg-blue" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days31to45 / kpis.totalRetailUnits) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-silver mb-1">
                <span>46 – 60 Days (Review Required):</span>
                <span className="text-warning font-bold">{kpis.ageingBreakdown.days46to60} units</span>
              </div>
              <div className="h-1.5 w-full bg-asphalt rounded-full overflow-hidden">
                <div className="h-full bg-warning" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days46to60 / kpis.totalRetailUnits) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-silver mb-1">
                <span>61 – 90 Days (Ageing Stock):</span>
                <span className="text-negative font-bold">{kpis.ageingBreakdown.days61to90} units</span>
              </div>
              <div className="h-1.5 w-full bg-asphalt rounded-full overflow-hidden">
                <div className="h-full bg-negative/80" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.days61to90 / kpis.totalRetailUnits) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-silver mb-1">
                <span>90+ Days (Critical Ageing):</span>
                <span className="text-negative font-bold">{kpis.ageingBreakdown.over90} units</span>
              </div>
              <div className="h-1.5 w-full bg-asphalt rounded-full overflow-hidden">
                <div className="h-full bg-negative" style={{ width: `${kpis.totalRetailUnits > 0 ? (kpis.ageingBreakdown.over90 / kpis.totalRetailUnits) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Charts */}
        <div className="lg:col-span-3">
          <DashboardCharts vehicles={activeVehicles || []} />
        </div>

      </div>

      {/* Recent Leads & Buying Signals */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Recent Leads */}
        <div className="xl:col-span-3 bg-carbon border border-steel rounded-[2px] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne font-bold text-base text-cream">Recent Customer Enquiries</h2>
            <Link href="/leads" className="font-mono text-[11px] text-blue hover:underline uppercase flex items-center gap-1">
              View all leads <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-1">
            {recentLeads && recentLeads.length > 0 ? recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between py-3 border-b border-steel/50 hover:bg-asphalt/50 px-2 -mx-2 rounded-[2px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] px-2 py-0.5 border border-blue/20 text-blue bg-blue/5 rounded-[2px] uppercase">
                    {lead.source}
                  </span>
                  <div>
                    <p className="font-inter font-medium text-xs text-cream group-hover:text-blue transition-colors">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="font-inter text-[11px] text-silver">
                      {Array.isArray(lead.vehicles) ? (lead.vehicles[0] ? `${lead.vehicles[0].make} ${lead.vehicles[0].model}` : 'General enquiry') : (lead.vehicles ? `${(lead.vehicles as any).make} ${(lead.vehicles as any).model}` : 'General enquiry')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={lead.status === 'won' ? 'positive' : 'outline'} className="font-mono text-[9px] uppercase">
                    {lead.status}
                  </Badge>
                  <span className="font-mono text-[10px] text-pewter">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            )) : (
              <p className="font-inter text-xs text-pewter py-8 text-center">No leads recorded yet.</p>
            )}
          </div>
        </div>

        {/* Buying Signals Preview */}
        <div className="xl:col-span-2">
          <BuyingSignalsPreview signals={buyingSignals || []} />
        </div>

      </div>

    </div>
  )
}
