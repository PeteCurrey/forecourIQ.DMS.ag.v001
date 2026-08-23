import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Wrench, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardService } from '@/lib/services/dashboard/dashboard-service';
import DashboardGauges from '@/components/dashboard/dashboard-gauges';
import AttentionVehicles from '@/components/dashboard/attention-vehicles';
import TodayTimeline from '@/components/dashboard/today-timeline';
import StockAgeingDistribution from '@/components/dashboard/stock-ageing-distribution';
import SalesPipelineStrip from '@/components/dashboard/sales-pipeline-strip';
import PerformanceChart30d from '@/components/dashboard/performance-chart-30d';
import IntelligenceDecisionFeed from '@/components/dashboard/intelligence-decision-feed';
import StockMovementsWidget from '@/components/dashboard/stock-movements-widget';
import TeamActivityWidget from '@/components/dashboard/team-activity-widget';

export const metadata = {
  title: 'Daily Control Centre | ForecourIQ DMS',
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
  const formattedDate = format(now, 'EEEE d MMMM yyyy');

  const { kpis, dealKpis, gauges, attentionVehicles, todayFocus, stockMovements, teamActivity, canViewMargin } = data;

  return (
    <div className="max-w-[1520px] mx-auto w-full space-y-8 pb-20">

      {/* ── REGION 1: MANAGEMENT HEADER ── */}
      <div
        className="reveal-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-steel/50 pb-6"
        style={{ animationDelay: '0ms' }}
      >
        <div>
          {/* Greeting */}
          <h1 className="font-sans font-semibold text-[1.6rem] leading-tight text-cream tracking-tight">
            {greeting}, {firstName}
          </h1>

          {/* Dealership & Date */}
          <p className="font-sans text-sm text-pewter mt-0.5">
            {data.dealershipName} ·{' '}
            <span className="text-silver">{formattedDate}</span>
          </p>

          {/* Dynamic summary sentence — deterministic from real data */}
          <p className="font-sans text-xs text-pewter/80 mt-2 italic">
            {data.summarySentence}
          </p>
        </div>

        {/* Contextual Header Actions (role-scoped) */}
        <div className="flex items-center gap-2 shrink-0">
          {(data.userRole === 'admin' || data.userRole === 'dealer_principal') ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/stock/preparation" className="flex items-center gap-1.5 font-sans text-xs">
                  <Wrench size={12} className="text-pewter" />
                  Prep Board
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/stock/add" className="flex items-center gap-1.5 font-sans text-xs font-semibold">
                  <Plus size={12} />
                  Add Vehicle
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/team" className="flex items-center gap-1.5 font-sans text-xs">
                  <MessageSquare size={12} className="text-pewter" />
                  Team Chat
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/leads" className="flex items-center gap-1.5 font-sans text-xs font-semibold">
                  My Leads
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── REGION 2: COMMERCIAL METRICS STRIP ── */}
      {/* Premium canvas-style financial metrics — tabular numerals, no box */}
      <div
        className="reveal-2 grid grid-cols-2 md:grid-cols-4 gap-0"
        style={{ animationDelay: '70ms' }}
      >
        {/* Separator rule styling via dividers */}
        <div className="pb-3 md:pb-0 md:pr-8 md:border-r border-steel/50">
          <p className="font-sans text-[10px] text-pewter font-semibold uppercase tracking-widest mb-2">Retail Stock</p>
          <span className="font-sans font-semibold text-3xl text-cream tracking-tight tabular-nums block leading-none">
            {kpis.totalRetailUnits}
          </span>
          <p className="font-sans text-[11px] text-pewter mt-2">
            {kpis.vehiclesInPreparation} in prep · {kpis.vehiclesReserved} reserved
          </p>
        </div>

        <div className="pb-3 md:pb-0 md:px-8 md:border-r border-steel/50">
          <p className="font-sans text-[10px] text-pewter font-semibold uppercase tracking-widest mb-2">
            {canViewMargin ? 'Capital Invested' : 'Active Leads'}
          </p>
          <span className="font-sans font-semibold text-3xl text-cream tracking-tight tabular-nums block leading-none">
            {canViewMargin ? formatCurrency(kpis.totalStockValue) : (data.roleSpecific.myLeadsCount || 0)}
          </span>
          <p className="font-sans text-[11px] text-pewter mt-2">
            {canViewMargin ? 'Acquisition & preparation ledger' : 'Assigned customer opportunities'}
          </p>
        </div>

        <div className="pt-3 md:pt-0 md:px-8 md:border-r border-steel/50">
          <p className="font-sans text-[10px] text-pewter font-semibold uppercase tracking-widest mb-2">
            {canViewMargin ? 'Potential Gross' : 'Deals Active'}
          </p>
          <span className={cn(
            'font-sans font-semibold text-3xl tracking-tight tabular-nums block leading-none',
            canViewMargin ? 'text-emerald-600' : 'text-cream'
          )}>
            {canViewMargin ? formatCurrency(kpis.potentialGrossMargin) : (dealKpis.activeDealsCount || 0)}
          </span>
          <p className="font-sans text-[11px] text-pewter mt-2">
            {canViewMargin
              ? `Avg ${formatCurrency(kpis.averageGrossMargin)} / vehicle`
              : `${dealKpis.totalDealsThisMonth || 0} completed this month`}
          </p>
        </div>

        <div className="pt-3 md:pt-0 md:pl-8">
          <p className="font-sans text-[10px] text-pewter font-semibold uppercase tracking-widest mb-2">Avg Stock Age</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'font-sans font-semibold text-3xl tracking-tight tabular-nums leading-none',
              kpis.averageDaysInStock < 30 ? 'text-emerald-600'
              : kpis.averageDaysInStock < 45 ? 'text-cream'
              : 'text-amber-500'
            )}>
              {kpis.averageDaysInStock}
            </span>
            <span className="font-sans text-sm text-pewter">days</span>
          </div>
          <p className="font-sans text-[11px] text-pewter mt-2">
            {kpis.vehiclesOver45Days} units over 45 days
          </p>
        </div>
      </div>

      {/* Thin separator */}
      <div className="border-t border-steel/40" />

      {/* ── REGION 3: DEALERSHIP INSTRUMENTS ── */}
      <div className="reveal-3" style={{ animationDelay: '140ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans text-sm font-semibold text-cream">Dealership Instruments</h2>
          <p className="text-[11px] text-pewter">Denominators verified · Real stock & CRM data</p>
        </div>
        <DashboardGauges gauges={gauges} />
      </div>

      {/* ── REGION 4: TODAY'S AGENDA ── */}
      <div className="reveal-4" style={{ animationDelay: '210ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans text-sm font-semibold text-cream">Today's Agenda</h2>
          <Link href="/appointments" className="text-xs text-pewter hover:text-cream underline">
            All Appointments →
          </Link>
        </div>
        <TodayTimeline items={todayFocus} />
      </div>

      {/* ── REGION 5: VEHICLES REQUIRING ATTENTION ── */}
      <div className="reveal-5" style={{ animationDelay: '280ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans text-sm font-semibold text-cream">Vehicles Requiring Attention</h2>
          <Link href="/stock" className="text-xs text-pewter hover:text-cream underline">
            All Stockbook ({kpis.totalRetailUnits}) →
          </Link>
        </div>
        <AttentionVehicles vehicles={attentionVehicles} canViewMargin={canViewMargin} />
      </div>

      {/* ── REGION 6: STOCK AGEING DISTRIBUTION ── */}
      <div className="reveal-5" style={{ animationDelay: '310ms' }}>
        <StockAgeingDistribution
          brackets={data.stockAgeDistribution}
          ageingCapitalExposed={data.ageingCapitalExposed}
          canViewMargin={canViewMargin}
        />
      </div>

      {/* ── REGION 7: DEAL DESK & 30-DAY PERFORMANCE ── */}
      <div
        className="reveal-6 grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{ animationDelay: '350ms' }}
      >
        <SalesPipelineStrip pipeline={data.salesPipeline} canViewMargin={canViewMargin} />
        <PerformanceChart30d
          points={data.performance30d.points}
          totalSold={data.performance30d.totalSold}
          totalGross={data.performance30d.totalGross}
          canViewMargin={canViewMargin}
        />
      </div>

      {/* ── REGION 8: INTELLIGENCE DECISION FEED ── */}
      {data.intelligenceFeed.length > 0 && (
        <div className="reveal-7" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-sm font-semibold text-cream">Intelligence</h2>
            <Link href="/command-centre" className="text-xs text-pewter hover:text-cream underline">
              Full Command Centre →
            </Link>
          </div>
          <IntelligenceDecisionFeed items={data.intelligenceFeed} />
        </div>
      )}

      {/* ── REGION 9: TEAM ACTIVITY + STOCK MOVEMENTS ── */}
      <div
        className="reveal-7 grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{ animationDelay: '490ms' }}
      >
        <TeamActivityWidget events={teamActivity} />
        {data.multiSite && stockMovements && (
          <StockMovementsWidget movements={stockMovements} />
        )}
      </div>

    </div>
  );
}
