'use client';

import React, { useRef, useEffect } from 'react';
import { BreathingCard } from '@/components/ui/breathing-card';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Car, 
  AlertCircle, 
  RotateCcw, 
  Layers, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export interface FilmstripItem {
  id: string;
  title: string;
  subtitle?: string;
  vrmPlate?: string;
  metric?: string;
  metricLabel?: string;
  statusBadge?: {
    label: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  };
  imageUrl?: string | null;
  data?: any;
}

export interface RelatedMiniCard {
  id: string;
  code?: string; // Mirrors the "40CN / 53CN" tag pattern from reference
  title: string;
  subtitle: string;
  status?: 'active' | 'pending' | 'completed' | 'warning' | 'critical';
  metric?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface DashboardShellProps {
  // Zone 1: Left Detail Panel
  leftPanel?: React.ReactNode;
  leftPanelTitle?: string;
  leftPanelSubtitle?: string;

  // Zone 2: Center Hero 3D Visual Area
  centerHero?: React.ReactNode;
  centerHeroTitle?: string;
  centerHeroAction?: React.ReactNode;

  // Zone 3: Right Secondary Detail Panel
  rightPanel?: React.ReactNode;
  rightPanelTitle?: string;
  relatedMiniCards?: RelatedMiniCard[];

  // Zone 4: Bottom Filmstrip
  filmstripItems?: FilmstripItem[];
  selectedFilmstripId?: string;
  onSelectFilmstripItem?: (item: FilmstripItem) => void;
  filmstripTitle?: string;
  filmstripAction?: React.ReactNode;

  // Lifecycle States
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;

  className?: string;
  children?: React.ReactNode;
}

/**
 * DashboardShell — Canonical 3-zone layout + bottom filmstrip for ForecourIQ DMS.
 *
 * Architecture:
 * - Left Panel: Record/Vehicle Primary Detail & Commercial Ledger
 * - Center Area: 3D "Breathing" Hero Visual & Live Cluster Analytics
 * - Right Panel: Secondary Detail & Stacked Related Mini-Cards (e.g. leads, reconditioning jobs)
 * - Bottom Filmstrip: Horizontally scrollable selection cards with focus/lift state
 */
export function DashboardShell({
  leftPanel,
  leftPanelTitle,
  leftPanelSubtitle,
  centerHero,
  centerHeroTitle,
  centerHeroAction,
  rightPanel,
  rightPanelTitle,
  relatedMiniCards,
  filmstripItems,
  selectedFilmstripId,
  onSelectFilmstripItem,
  filmstripTitle = 'Active Forecourt Inventory',
  filmstripAction,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  isEmpty = false,
  emptyMessage,
  className,
  children,
}: DashboardShellProps) {
  const filmstripScrollRef = useRef<HTMLDivElement>(null);

  const scrollFilmstrip = (direction: 'left' | 'right') => {
    if (filmstripScrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      filmstripScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Keyboard navigation for filmstrip items
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!filmstripItems || !onSelectFilmstripItem) return;
    if (e.key === 'ArrowRight' && index < filmstripItems.length - 1) {
      e.preventDefault();
      onSelectFilmstripItem(filmstripItems[index + 1]);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      onSelectFilmstripItem(filmstripItems[index - 1]);
    }
  };

  if (isError) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 bg-surface border border-border rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-status-danger/10 border border-status-danger/30 flex items-center justify-center text-status-danger mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-h3 text-text-primary mb-2">Failed to load dashboard data</h3>
        <p className="text-body-sm text-text-secondary max-w-md mb-6">
          {errorMessage || 'A connection issue occurred while syncing with the dealership operating ledger.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dim text-white font-semibold text-body-sm shadow-glow-primary transition-all focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full flex flex-col space-y-6', className)}>
      
      {/* ── THREE-ZONE MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ZONE 1: LEFT DETAIL PANEL */}
        <div className="lg:col-span-3 flex flex-col">
          <BreathingCard
            variant="surface"
            glowPosition="top-left"
            breathing={false}
            className="flex-1 flex flex-col justify-between p-5 border-border bg-surface shadow-xs"
          >
            {isLoading ? (
              <PanelSkeleton rows={6} />
            ) : leftPanel ? (
              <div className="space-y-4">
                {(leftPanelTitle || leftPanelSubtitle) && (
                  <div className="border-b border-border pb-3">
                    {leftPanelTitle && (
                      <h2 className="text-h4 text-text-primary font-bold">{leftPanelTitle}</h2>
                    )}
                    {leftPanelSubtitle && (
                      <p className="text-caption text-text-secondary mt-0.5">{leftPanelSubtitle}</p>
                    )}
                  </div>
                )}
                {leftPanel}
              </div>
            ) : (
              <PanelEmpty message="Select an item from the filmstrip below to inspect record ledger." />
            )}
          </BreathingCard>
        </div>

        {/* ZONE 2: CENTER HERO 3D VISUAL AREA */}
        <div className="lg:col-span-6 flex flex-col">
          <BreathingCard
            variant="glass"
            glowPosition="center"
            breathing={!isLoading}
            className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden"
          >
            {isLoading ? (
              <PanelSkeleton rows={8} />
            ) : (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                {(centerHeroTitle || centerHeroAction) && (
                  <div className="flex items-center justify-between border-b border-border/60 pb-4">
                    {centerHeroTitle && (
                      <h2 className="text-h3 text-text-primary font-bold tracking-tight">
                        {centerHeroTitle}
                      </h2>
                    )}
                    {centerHeroAction}
                  </div>
                )}
                
                {/* Center Visual Content */}
                <div className="flex-1 flex items-center justify-center my-2">
                  {centerHero}
                </div>
              </div>
            )}
          </BreathingCard>
        </div>

        {/* ZONE 3: RIGHT SECONDARY DETAIL & NESTED MINI-CARDS */}
        <div className="lg:col-span-3 flex flex-col">
          <BreathingCard
            variant="surface-raised"
            glowPosition="top-right"
            breathing={false}
            className="flex-1 flex flex-col justify-between p-5 border-border bg-surface-raised shadow-md"
          >
            {isLoading ? (
              <PanelSkeleton rows={6} />
            ) : (
              <div className="space-y-4">
                {rightPanelTitle && (
                  <div className="border-b border-border pb-3 flex items-center justify-between">
                    <h2 className="text-h4 text-text-primary font-bold">{rightPanelTitle}</h2>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}

                {/* Custom right panel content */}
                {rightPanel}

                {/* Stacked Mini-Card Pattern (mirroring 40CN / 53CN from reference) */}
                {relatedMiniCards && relatedMiniCards.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    {relatedMiniCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-3 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all duration-200 group relative shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          {card.code && (
                            <span className="font-mono text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/30 uppercase">
                              {card.code}
                            </span>
                          )}
                          {card.metric && (
                            <span className="font-sans text-caption font-bold text-text-primary tabular-nums">
                              {card.metric}
                            </span>
                          )}
                        </div>

                        <div className="text-body-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                          {card.title}
                        </div>
                        <div className="text-caption text-text-secondary line-clamp-1 mt-0.5">
                          {card.subtitle}
                        </div>

                        {card.actionUrl && (
                          <a
                            href={card.actionUrl}
                            className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-caption text-primary font-semibold hover:underline"
                          >
                            <span>{card.actionLabel || 'View Record'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </BreathingCard>
        </div>

      </div>

      {/* ── OPTIONAL EMBEDDED SECTIONS / CHILDREN ── */}
      {children}

      {/* ── ZONE 4: BOTTOM HORIZONTAL FILMSTRIP ── */}
      {filmstripItems && filmstripItems.length > 0 && (
        <section className="w-full bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          {/* Filmstrip Header & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-primary" />
              <h3 className="text-body-sm font-bold uppercase tracking-wider text-text-primary font-mono">
                {filmstripTitle} ({filmstripItems.length})
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {filmstripAction}
              
              {/* Scroll buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollFilmstrip('left')}
                  className="p-1.5 rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary outline-hidden transition-colors"
                  aria-label="Scroll filmstrip left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollFilmstrip('right')}
                  className="p-1.5 rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary outline-hidden transition-colors"
                  aria-label="Scroll filmstrip right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontally Scrollable Strip */}
          <div
            ref={filmstripScrollRef}
            className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth focus-visible:ring-2 focus-visible:ring-primary rounded-xl outline-hidden no-scrollbar"
            role="list"
            aria-label="Filmstrip records"
          >
            {filmstripItems.map((item, index) => {
              const isSelected = selectedFilmstripId === item.id;
              const hasSelection = !!selectedFilmstripId;

              return (
                <div
                  key={item.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => onSelectFilmstripItem?.(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectFilmstripItem?.(item);
                    }
                    handleKeyDown(e, index);
                  }}
                  className={cn(
                    'w-64 sm:w-72 shrink-0 rounded-xl border p-3 cursor-pointer transition-all duration-300 outline-hidden',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
                    isSelected
                      ? 'bg-surface-raised border-primary shadow-glow-primary -translate-y-1.5 scale-102 z-10'
                      : hasSelection
                      ? 'bg-surface/80 border-border/80 opacity-75 hover:opacity-100 hover:border-primary/50 hover:bg-surface'
                      : 'bg-surface border-border hover:border-primary/50 hover:shadow-md'
                  )}
                  aria-selected={isSelected}
                >
                  {/* Vehicle Media / Thumbnail */}
                  <div className="w-full h-28 rounded-lg bg-surface-raised overflow-hidden relative mb-2.5 border border-border">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-108"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <Car className="w-8 h-8 opacity-40" />
                      </div>
                    )}

                    {/* Registration badge */}
                    {item.vrmPlate && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="font-mono text-[10px] font-black tracking-widest bg-[#F5B400] text-black px-1.5 py-0.5 rounded-xs shadow-xs border border-black/30 uppercase">
                          {item.vrmPlate}
                        </span>
                      </div>
                    )}

                    {/* Status Pill */}
                    {item.statusBadge && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className={cn(
                          'text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border backdrop-blur-md bg-black/60 shadow-xs',
                          item.statusBadge.variant === 'primary' && 'text-primary border-primary/30',
                          item.statusBadge.variant === 'success' && 'text-status-success border-status-success/30',
                          item.statusBadge.variant === 'warning' && 'text-status-warning border-status-warning/30',
                          item.statusBadge.variant === 'danger' && 'text-status-danger border-status-danger/30',
                          (!item.statusBadge.variant || item.statusBadge.variant === 'neutral') && 'text-text-secondary border-border'
                        )}>
                          {item.statusBadge.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Specs */}
                  <div className="space-y-1">
                    <div className="text-body-sm font-bold text-text-primary truncate">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-caption text-text-secondary truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Metric Ledger */}
                  {item.metric && (
                    <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-caption">
                      <span className="text-text-muted font-medium">{item.metricLabel || 'Value'}</span>
                      <span className="font-bold text-text-primary tabular-nums font-mono">
                        {item.metric}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}

/**
 * PanelSkeleton — Skeleton loader using low-intensity breathing motion (no spinners).
 */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3.5 animate-pulse w-full">
      <div className="h-5 bg-border/40 rounded-md w-1/3" />
      <div className="h-28 bg-border/20 rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-border/25 rounded-md"
          style={{ width: `${Math.max(40, 95 - i * 12)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * PanelEmpty — Clean empty state representation.
 */
export function PanelEmpty({ message = 'No records available in this ledger.' }: { message?: string }) {
  return (
    <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-text-muted">
      <Layers className="w-6 h-6 mb-2 opacity-40" />
      <p className="text-body-sm font-medium max-w-xs">{message}</p>
    </div>
  );
}

export default DashboardShell;
