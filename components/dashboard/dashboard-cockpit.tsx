'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  RoleDashboardData, 
  AttentionVehicle 
} from '@/lib/services/dashboard/dashboard-service';
import { DashboardShell, FilmstripItem, RelatedMiniCard } from '@/components/dashboard/dashboard-shell';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { 
  Car, 
  Clock, 
  Wrench, 
  FileCheck, 
  Users, 
  ExternalLink, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import TodayTimeline from '@/components/dashboard/today-timeline';
import StockAgeingDistribution from '@/components/dashboard/stock-ageing-distribution';
import SalesPipelineStrip from '@/components/dashboard/sales-pipeline-strip';
import PerformanceChart30d from '@/components/dashboard/performance-chart-30d';
import IntelligenceDecisionFeed from '@/components/dashboard/intelligence-decision-feed';
import StockMovementsWidget from '@/components/dashboard/stock-movements-widget';
import TeamActivityWidget from '@/components/dashboard/team-activity-widget';

interface DashboardCockpitProps {
  data: RoleDashboardData;
}

export default function DashboardCockpit({ data }: DashboardCockpitProps) {
  const { 
    kpis, 
    dealKpis, 
    gauges, 
    attentionVehicles, 
    todayFocus, 
    stockAgeDistribution, 
    ageingCapitalExposed, 
    salesPipeline, 
    performance30d, 
    intelligenceFeed, 
    stockMovements, 
    teamActivity, 
    canViewMargin 
  } = data;

  // Selected vehicle state in the cockpit
  const [selectedId, setSelectedId] = useState<string>(
    attentionVehicles[0]?.id || 'v-1'
  );

  const selectedVehicle: AttentionVehicle = 
    attentionVehicles.find((v) => v.id === selectedId) || 
    attentionVehicles[0] || {
      id: 'v-fallback',
      registration: 'RK20 FLN',
      make: 'Audi',
      model: 'RS4',
      variant: 'Avant TFSI Quattro',
      askingPrice: 62990,
      purchasePrice: 56600,
      investedCost: 57400,
      daysInStock: 52,
      status: 'available',
      reason: '52 days in stock · Pricing review recommended',
      reasonType: 'pricing',
      actionUrl: '/stock',
      imageUrl: null,
    };

  // Build Filmstrip Items from attentionVehicles
  const filmstripItems: FilmstripItem[] = attentionVehicles.map((v) => {
    let badgeVariant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' = 'primary';
    if (v.status === 'available') badgeVariant = 'success';
    else if (v.status === 'preparation') badgeVariant = 'warning';
    else if (v.status === 'reserved') badgeVariant = 'primary';

    return {
      id: v.id,
      title: `${v.make} ${v.model}`,
      subtitle: v.variant || `${v.daysInStock}d in stock`,
      vrmPlate: v.registration,
      metric: v.askingPrice ? formatCurrency(v.askingPrice) : '£POA',
      metricLabel: 'Retail Price',
      statusBadge: {
        label: v.status.toUpperCase(),
        variant: badgeVariant,
      },
      imageUrl: v.imageUrl,
      data: v,
    };
  });

  // Calculate gross margin for selected vehicle if margin permission is enabled
  const estimatedGross = (selectedVehicle.askingPrice || 0) - (selectedVehicle.investedCost || selectedVehicle.purchasePrice || 0);
  const marginPct = (selectedVehicle.askingPrice && selectedVehicle.askingPrice > 0 && estimatedGross > 0)
    ? Math.round((estimatedGross / selectedVehicle.askingPrice) * 100)
    : 0;

  // Related Mini-Cards for Zone 3 (mirroring the 40CN / 53CN pattern from reference)
  const relatedMiniCards: RelatedMiniCard[] = [
    {
      id: 'pdi-card',
      code: 'PDI-01',
      title: selectedVehicle.status === 'preparation' ? 'Prep & PDI In Progress' : 'PDI Inspection Passed',
      subtitle: selectedVehicle.status === 'preparation' ? 'Mechanical checklist pending sign-off' : '100-point pre-delivery appraisal verified',
      metric: selectedVehicle.status === 'preparation' ? 'IN PREP' : 'CERTIFIED',
      actionUrl: '/stock/preparation',
      actionLabel: 'Open Prep Board',
    },
    {
      id: 'mot-card',
      code: 'MOT-UK',
      title: 'MOT & DVLA Status',
      subtitle: selectedVehicle.daysInStock > 50 ? 'Valid MOT · Check expiry schedule' : 'Clean DVLA record & road readiness',
      metric: 'VALID',
      actionUrl: `/stock/${selectedVehicle.id}`,
      actionLabel: 'View Vehicle Spec',
    },
    {
      id: 'leads-card',
      code: 'LEAD-03',
      title: 'Assigned Customer Enquiries',
      subtitle: '2 active prospective buyers tracking this unit',
      metric: '2 LEADS',
      actionUrl: '/leads',
      actionLabel: 'Follow-up Leads',
    },
    {
      id: 'deal-card',
      code: 'DEAL-IQ',
      title: 'Deal Pipeline Status',
      subtitle: selectedVehicle.status === 'reserved' ? 'Customer deposit secured' : 'Available for immediate proposal & handover',
      metric: selectedVehicle.status === 'reserved' ? 'DEPOSIT' : 'ACTIVE',
      actionUrl: '/deals',
      actionLabel: 'Create Proposal',
    },
  ];

  // ── ZONE 1: LEFT DETAIL PANEL CONTENT ──
  const leftPanelContent = (
    <div className="space-y-4">
      {/* Registration & Model Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-block mb-1.5">
            <span className="font-mono text-xs font-black tracking-widest bg-[#F5B400] text-black px-2 py-0.5 rounded-xs shadow-xs border border-black/30 uppercase">
              {selectedVehicle.registration}
            </span>
          </div>
          <h3 className="text-h4 font-bold text-text-primary leading-tight">
            {selectedVehicle.make} {selectedVehicle.model}
          </h3>
          {selectedVehicle.variant && (
            <p className="text-caption text-text-secondary mt-0.5">{selectedVehicle.variant}</p>
          )}
        </div>

        <span className={cn(
          'text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shrink-0',
          selectedVehicle.status === 'available' && 'bg-status-success/10 text-status-success border-status-success/30',
          selectedVehicle.status === 'preparation' && 'bg-status-warning/10 text-status-warning border-status-warning/30',
          selectedVehicle.status === 'reserved' && 'bg-primary/10 text-primary border-primary/30',
          (!['available', 'preparation', 'reserved'].includes(selectedVehicle.status)) && 'bg-surface-raised text-text-secondary border-border'
        )}>
          {selectedVehicle.status}
        </span>
      </div>

      {/* Stock Ageing & Attention Reason Banner */}
      <div className="p-3 rounded-xl bg-surface-raised border border-border space-y-1.5">
        <div className="flex items-center justify-between text-caption">
          <span className="text-text-muted font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Stock Age
          </span>
          <span className={cn(
            'font-bold tabular-nums font-mono',
            selectedVehicle.daysInStock > 60 ? 'text-status-danger'
            : selectedVehicle.daysInStock > 45 ? 'text-status-warning'
            : 'text-status-success'
          )}>
            {selectedVehicle.daysInStock} days
          </span>
        </div>
        <p className="text-caption text-text-secondary leading-snug">
          {selectedVehicle.reason}
        </p>
      </div>

      {/* Financial Ledger (Role-scoped for margin.read) */}
      <div className="space-y-2 pt-1 border-t border-border/80">
        <div className="flex items-baseline justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">Retail Asking</span>
          <span className="text-h3 font-bold text-text-primary tabular-nums font-mono">
            {selectedVehicle.askingPrice ? formatCurrency(selectedVehicle.askingPrice) : '£POA'}
          </span>
        </div>

        {canViewMargin && selectedVehicle.investedCost && (
          <div className="space-y-1.5 p-2.5 rounded-lg bg-surface-raised/50 border border-border/60 text-caption font-mono">
            <div className="flex justify-between text-text-secondary">
              <span>Invested Capital</span>
              <span className="tabular-nums font-bold text-text-primary">{formatCurrency(selectedVehicle.investedCost)}</span>
            </div>
            {selectedVehicle.purchasePrice && (
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Acquisition Cost</span>
                <span className="tabular-nums">{formatCurrency(selectedVehicle.purchasePrice)}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-border flex justify-between items-center text-status-success font-bold">
              <span>Potential Gross</span>
              <span className="tabular-nums">
                {formatCurrency(Math.max(0, estimatedGross))} ({marginPct}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation action */}
      <div className="pt-2">
        <Link
          href={`/stock/${selectedVehicle.id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dim text-white font-semibold text-body-sm shadow-glow-primary transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Inspect Vehicle Ledger</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );

  // ── ZONE 2: CENTER HERO 3D VISUAL AREA ──
  const centerHeroContent = (
    <div className="w-full h-full flex flex-col justify-between space-y-4">
      {/* 3D Perspective Floating Vehicle Stage */}
      <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-surface-raised border border-border/80 shadow-glass-card group flex items-center justify-center">
        {selectedVehicle.imageUrl ? (
          <img
            src={selectedVehicle.imageUrl}
            alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-text-muted gap-2">
            <Car className="w-16 h-16 opacity-30 text-primary animate-pulse" />
            <span className="text-caption font-mono uppercase tracking-widest text-text-muted">Awaiting Vehicle Imagery</span>
          </div>
        )}

        {/* Ambient Electric-Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-bg-surface via-transparent to-black/40 pointer-events-none" />

        {/* Floating Cockpit Badges */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-primary/40 text-primary text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Forecourt Telemetry
          </span>
        </div>

        <div className="absolute top-3 right-3 z-10">
          <span className="font-mono text-xs font-black tracking-widest bg-[#F5B400] text-black px-2.5 py-1 rounded-xs shadow-md border border-black/30 uppercase">
            {selectedVehicle.registration}
          </span>
        </div>

        {/* Bottom Hero HUD strip */}
        <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between p-2.5 rounded-xl bg-surface/85 backdrop-blur-md border border-border/80 text-caption shadow-lg">
          <div>
            <span className="text-text-muted text-[10px] uppercase font-mono block">Selected Unit</span>
            <span className="text-text-primary font-bold text-body-sm">{selectedVehicle.make} {selectedVehicle.model}</span>
          </div>
          <div className="text-right">
            <span className="text-text-muted text-[10px] uppercase font-mono block">Retail Guide</span>
            <span className="text-text-primary font-mono font-bold text-body-sm">
              {selectedVehicle.askingPrice ? formatCurrency(selectedVehicle.askingPrice) : '£POA'}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Dealership Instrument Strip in Center Zone */}
      {gauges && gauges.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {gauges.map((g) => {
            const isGood = g.status === 'good';
            const isWarning = g.status === 'warning';
            const strokeColor = isGood ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444';

            return (
              <div
                key={g.id}
                className="p-2.5 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors group text-center flex flex-col justify-between"
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: strokeColor }} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-secondary truncate">
                    {g.label}
                  </span>
                </div>
                <div className="text-h4 font-bold font-sans tabular-nums text-text-primary">
                  {g.percentage}<span className="text-caption text-text-muted ml-0.5">%</span>
                </div>
                <div className="text-[10px] text-text-muted truncate mt-0.5">
                  {g.numerator}/{g.denominator} units
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-8">
      
      {/* ── 3-ZONE COCKPIT + HORIZONTAL FILMSTRIP ── */}
      <DashboardShell
        leftPanel={leftPanelContent}
        leftPanelTitle="Record Ledger"
        leftPanelSubtitle="Commercial & Vehicle Profile"
        centerHero={centerHeroContent}
        centerHeroTitle="Vehicle Cockpit & Telemetry"
        centerHeroAction={
          <Link
            href="/stock"
            className="flex items-center gap-1.5 text-caption font-semibold text-primary hover:text-primary-dim transition-colors"
          >
            <span>Full Stockbook</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
        rightPanelTitle="Operational Actions"
        relatedMiniCards={relatedMiniCards}
        filmstripItems={filmstripItems}
        selectedFilmstripId={selectedId}
        onSelectFilmstripItem={(item) => setSelectedId(item.id)}
        filmstripTitle="Active Forecourt Inventory & Attention Units"
        filmstripAction={
          <Link
            href="/stock"
            className="text-caption font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All ({kpis.totalRetailUnits})</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        }
      />

      {/* ── INTEGRATED CONTROL CENTRE SECTIONS (Below Cockpit) ── */}

      {/* Today's Agenda */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h4 font-bold text-text-primary">Today's Agenda & Appointments</h2>
          <Link href="/appointments" className="text-caption text-text-secondary hover:text-text-primary underline">
            All Appointments →
          </Link>
        </div>
        <TodayTimeline items={todayFocus} />
      </div>

      {/* Stock Ageing Distribution */}
      <div className="space-y-3">
        <StockAgeingDistribution
          brackets={stockAgeDistribution}
          ageingCapitalExposed={ageingCapitalExposed}
          canViewMargin={canViewMargin}
        />
      </div>

      {/* Deal Desk & 30-Day Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <SalesPipelineStrip pipeline={salesPipeline} canViewMargin={canViewMargin} />
        <PerformanceChart30d
          points={performance30d.points}
          totalSold={performance30d.totalSold}
          totalGross={performance30d.totalGross}
          canViewMargin={canViewMargin}
        />
      </div>

      {/* Intelligence Decision Feed */}
      {intelligenceFeed && intelligenceFeed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h4 font-bold text-text-primary">Intelligence & Decision Feed</h2>
            <Link href="/intelligence/buying" className="text-caption text-text-secondary hover:text-text-primary underline">
              Commercial Intelligence Hub →
            </Link>
          </div>
          <IntelligenceDecisionFeed items={intelligenceFeed} />
        </div>
      )}

      {/* Team Activity + Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TeamActivityWidget events={teamActivity} />
        {data.multiSite && stockMovements && (
          <StockMovementsWidget movements={stockMovements} />
        )}
      </div>

    </div>
  );
}
