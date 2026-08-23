import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  CheckSquare, 
  Car, 
  ArrowRight,
  TrendingUp,
  Brain,
  Layers,
  Handshake,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardService } from '@/lib/services/dashboard/dashboard-service';
import DashboardGauges from '@/components/dashboard/dashboard-gauges';
import AttentionVehicles from '@/components/dashboard/attention-vehicles';
import StockMovementsWidget from '@/components/dashboard/stock-movements-widget';
import TeamActivityWidget from '@/components/dashboard/team-activity-widget';
import LeadPipelineChart from '@/components/dashboard/dashboard-charts';

export const metadata = {
  title: 'Management Dashboard | ForecourIQ DMS',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const data = await DashboardService.getDashboardData(user.id);
  if (!data) return null;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = data.userFullName.split(' ')[0] || 'there';

  const { kpis, dealKpis, gauges, attentionVehicles, todayFocus, stockMovements, teamActivity, canViewMargin } = data;

  return (
    <div className="max-w-[1480px] mx-auto w-full space-y-8 pb-20">
      
      {/* 1. Header (reveal-1): Calm Operational Greeting */}
      <div className="reveal-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel/60 pb-5">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-cream tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="font-sans text-xs text-pewter mt-0.5">
            {data.dealershipName} · {format(now, 'EEEE d MMMM yyyy')} · <span className="capitalize">{data.userRole.replace('_', ' ')}</span> View
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data.userRole === 'admin' || data.userRole === 'dealer_principal' ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/stock/transfers" className="flex items-center gap-1.5 font-sans text-xs">
                  Stock transfers
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/stock/preparation" className="flex items-center gap-1.5 font-sans text-xs">
                  <Wrench size={13} className="text-pewter" />
                  Prep board
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/stock/add" className="flex items-center gap-1.5 font-sans text-xs font-semibold">
                  <Plus size={13} />
                  Add vehicle
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/team" className="flex items-center gap-1.5 font-sans text-xs">
                  <MessageSquare size={13} className="text-pewter" />
                  Team Chat
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/leads" className="flex items-center gap-1.5 font-sans text-xs font-semibold">
                  <Plus size={13} />
                  My Leads
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Commercial Summary Strip (reveal-2): Tabular Numerals & Connected Metrics */}
      <div className="reveal-2 bg-carbon border border-steel rounded-lg p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-steel">
          
          {/* Metric 1: Retail Stock */}
          <div className="pb-3 md:pb-0 md:pr-6">
            <p className="font-sans text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">Retail stock</p>
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-semibold text-2xl text-cream tracking-tight tabular-nums">
                {kpis.totalRetailUnits}
              </span>
              <span className="font-sans text-xs text-pewter">units</span>
            </div>
            <p className="font-sans text-[11px] text-pewter mt-1">
              {kpis.vehiclesInPreparation} in prep · {kpis.vehiclesReserved} reserved
            </p>
          </div>

          {/* Metric 2: Capital Invested (or My Leads for Sales) */}
          <div className="py-3 md:py-0 md:px-6">
            <p className="font-sans text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">
              {canViewMargin ? 'Capital invested' : 'Active Leads'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-semibold text-2xl text-cream tracking-tight tabular-nums">
                {canViewMargin ? formatCurrency(kpis.totalStockValue) : (data.roleSpecific.myLeadsCount || 0)}
              </span>
            </div>
            <p className="font-sans text-[11px] text-pewter mt-1">
              {canViewMargin ? 'Acquisition & preparation ledger' : 'Assigned customer opportunities'}
            </p>
          </div>

          {/* Metric 3: Potential Gross (or Deals for Sales) */}
          <div className="py-3 md:py-0 md:px-6">
            <p className="font-sans text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">
              {canViewMargin ? 'Potential gross' : 'Active Deals'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className={cn('font-sans font-semibold text-2xl tracking-tight tabular-nums', canViewMargin ? 'text-positive' : 'text-cream')}>
                {canViewMargin ? formatCurrency(kpis.potentialGrossMargin) : (dealKpis.activeDealsCount || 0)}
              </span>
            </div>
            <p className="font-sans text-[11px] text-pewter mt-1">
              {canViewMargin ? `Avg ${formatCurrency(kpis.averageGrossMargin)} / unit` : `${dealKpis.totalDealsThisMonth || 0} completed this month`}
            </p>
          </div>

          {/* Metric 4: Average Stock Age */}
          <div className="pt-3 md:pt-0 md:pl-6">
            <p className="font-sans text-[11px] text-pewter font-medium uppercase tracking-wider mb-1">Average stock age</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "font-sans font-semibold text-2xl tracking-tight tabular-nums",
                kpis.averageDaysInStock < 30 ? "text-positive" : kpis.averageDaysInStock < 45 ? "text-cream" : "text-warning"
              )}>
                {kpis.averageDaysInStock}
              </span>
              <span className="font-sans text-xs text-pewter">days</span>
            </div>
            <p className="font-sans text-[11px] text-pewter mt-1">
              {kpis.vehiclesOver45Days} units over 45 days
            </p>
          </div>

        </div>
      </div>

      {/* 3. Operational Gauges Strip (reveal-3) */}
      <div className="reveal-3">
        <DashboardGauges gauges={gauges} />
      </div>

      {/* 4. Primary Operational Grid (reveal-4): Today's Focus & Attention Vehicles */}
      <div className="reveal-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Today's Focus (6 cols) */}
        <div className="lg:col-span-6 bg-carbon border border-steel rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-steel pb-3">
            <div>
              <h2 className="font-sans font-semibold text-sm text-cream">Today's Focus</h2>
              <p className="font-sans text-xs text-pewter">Scheduled test drives, handovers, and priority tasks</p>
            </div>
            <span className="font-mono text-[10px] text-pewter bg-asphalt px-2 py-0.5 rounded">
              {todayFocus.length} ACTIONS
            </span>
          </div>

          <div className="divide-y divide-steel/60">
            {todayFocus.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-10 rounded bg-asphalt border border-steel overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : item.type === 'appointment' ? (
                      <Calendar className="w-4 h-4 text-pewter" />
                    ) : (
                      <CheckSquare className="w-4 h-4 text-pewter" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-pewter">{item.time}</span>
                      <span className="text-xs font-semibold text-cream truncate">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-pewter truncate mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
                <Link href={item.linkUrl} className="text-xs text-pewter hover:text-cream underline shrink-0">
                  Open →
                </Link>
              </div>
            ))}

            {todayFocus.length === 0 && (
              <p className="text-xs text-pewter py-6 text-center">No scheduled appointments or tasks due today.</p>
            )}
          </div>
        </div>

        {/* Vehicles Requiring Attention (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-semibold text-sm text-cream">Vehicles Requiring Attention</h2>
            <Link href="/stock" className="text-xs text-pewter hover:text-cream underline">
              All Stockbook ({kpis.totalRetailUnits}) →
            </Link>
          </div>
          <AttentionVehicles vehicles={attentionVehicles} canViewMargin={canViewMargin} />
        </div>

      </div>

      {/* 5. Secondary Operational Grid (reveal-5): Stock Movements + Team Activity */}
      <div className="reveal-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Multi-Site Stock Movements (6 cols if multi-site) */}
        {data.multiSite && stockMovements && (
          <div className="lg:col-span-6">
            <StockMovementsWidget movements={stockMovements} />
          </div>
        )}

        {/* Team Activity Feed (6 cols or full 12 if single site) */}
        <div className={cn(data.multiSite && stockMovements ? 'lg:col-span-6' : 'lg:col-span-12')}>
          <TeamActivityWidget events={teamActivity} />
        </div>

      </div>

    </div>
  );
}
