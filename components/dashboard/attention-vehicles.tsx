'use client';

import { AttentionVehicle } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Car, ChevronRight, Tag, Wrench, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface AttentionVehiclesProps {
  vehicles: AttentionVehicle[];
  canViewMargin: boolean;
}

export default function AttentionVehicles({ vehicles, canViewMargin }: AttentionVehiclesProps) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-xl p-8 text-center text-xs text-pewter">
        No vehicles currently require urgent operational attention.
      </div>
    );
  }

  const getReasonConfig = (type: string) => {
    switch (type) {
      case 'prep':
        return {
          icon: Wrench,
          label: 'PREPARATION',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          accent: 'border-l-amber-500',
        };
      case 'ageing':
        return {
          icon: Clock,
          label: 'AGEING EXPOSURE',
          badge: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
          accent: 'border-l-rose-500',
        };
      case 'pricing':
        return {
          icon: Tag,
          label: 'PRICING REVIEW',
          badge: 'bg-blue/10 border-blue/30 text-blue',
          accent: 'border-l-blue',
        };
      default:
        return {
          icon: ShieldAlert,
          label: 'ATTENTION REQUIRED',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          accent: 'border-l-amber-500',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {vehicles.map((v) => {
        const config = getReasonConfig(v.reasonType);
        const Icon = config.icon;
        const profitMargin = canViewMargin && v.askingPrice && v.investedCost ? v.askingPrice - v.investedCost : null;

        return (
          <div
            key={v.id}
            className="bg-carbon border border-steel rounded-xl overflow-hidden flex flex-col justify-between group hover:border-cream/50 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 relative"
          >
            {/* Vehicle Photography Media Container with Hover Zoom */}
            <div className="w-full h-44 bg-asphalt overflow-hidden relative flex items-center justify-center">
              {v.imageUrl ? (
                <img
                  src={v.imageUrl}
                  alt={`${v.make} ${v.model}`}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-pewter">
                  <Car className="w-10 h-10 mb-1 opacity-50" />
                  <span className="text-[10px]">Photo Pending</span>
                </div>
              )}

              {/* Ambient Dark Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              {/* Top Left: Authentic UK Style Plate Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="font-mono text-[11px] font-black tracking-widest bg-[#F5B400] text-black border border-black/40 px-2 py-0.5 rounded-[3px] shadow-md uppercase">
                  {v.registration}
                </span>
              </div>

              {/* Top Right: Status Badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className={cn('text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border backdrop-blur-md bg-black/60 shadow-md flex items-center gap-1', config.badge)}>
                  <Icon className="w-3 h-3" />
                  <span>{config.label}</span>
                </span>
              </div>

              {/* Bottom Scrim Info: Make/Model & Variant */}
              <div className="absolute bottom-2.5 left-3 right-3 z-10 text-white">
                <div className="font-sans font-bold text-sm leading-tight drop-shadow-sm truncate">
                  {v.make} {v.model}
                </div>
                <div className="text-[11px] text-white/80 truncate font-medium">
                  {v.variant || `${v.daysInStock} days on forecourt`}
                </div>
              </div>
            </div>

            {/* Content & Commercial Details */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              {/* Reason Explanation */}
              <div className="bg-asphalt/50 border border-steel/60 rounded-lg p-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-cream font-medium leading-relaxed">
                    {v.reason}
                  </span>
                </div>
              </div>

              {/* Commercial Ledger */}
              <div className="pt-2 border-t border-steel flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-cream tabular-nums">
                    {v.askingPrice ? formatCurrency(v.askingPrice) : 'POA'}
                    <span className="text-[10px] text-pewter font-normal ml-1">retail</span>
                  </div>
                  {canViewMargin && v.investedCost && (
                    <div className="text-[11px] text-pewter tabular-nums mt-0.5 flex items-center gap-1.5">
                      <span>Inv: {formatCurrency(v.investedCost)}</span>
                      {profitMargin !== null && profitMargin > 0 && (
                        <span className="text-emerald-600 font-semibold">(+{formatCurrency(profitMargin)})</span>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href={v.actionUrl}
                  className="px-3 py-1.5 rounded-lg bg-cream text-void dark:bg-cream dark:text-void hover:opacity-90 font-semibold text-xs transition-all flex items-center gap-1 shadow-xs group-hover:bg-blue group-hover:text-white"
                >
                  <span>Review</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
