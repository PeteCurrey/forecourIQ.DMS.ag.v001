'use client';

import { AttentionVehicle } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Car, ChevronRight, AlertTriangle, Clock, Tag, Wrench, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

interface AttentionVehiclesProps {
  vehicles: AttentionVehicle[];
  canViewMargin: boolean;
}

export default function AttentionVehicles({ vehicles, canViewMargin }: AttentionVehiclesProps) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-lg p-6 text-center text-xs text-pewter">
        No vehicles currently require urgent operational attention.
      </div>
    );
  }

  const getReasonBadge = (type: string) => {
    switch (type) {
      case 'prep':
        return <span className="text-[10px] uppercase font-mono font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">PREPARATION</span>;
      case 'ageing':
        return <span className="text-[10px] uppercase font-mono font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">AGEING</span>;
      case 'pricing':
        return <span className="text-[10px] uppercase font-mono font-semibold text-blue bg-blue-tint px-1.5 py-0.5 rounded border border-blue/20">PRICING</span>;
      case 'transfer':
        return <span className="text-[10px] uppercase font-mono font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">TRANSFER</span>;
      default:
        return <span className="text-[10px] uppercase font-mono font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">ATTENTION</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {vehicles.map((v) => (
        <div
          key={v.id}
          className="bg-carbon border border-steel rounded-lg overflow-hidden flex flex-col justify-between group hover:border-cream/40 transition-colors"
        >
          {/* Media Container with 1.025x hover zoom */}
          <div className="w-full h-36 bg-asphalt overflow-hidden relative flex items-center justify-center">
            {v.imageUrl ? (
              <img
                src={v.imageUrl}
                alt={`${v.make} ${v.model}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-pewter">
                <Car className="w-8 h-8 mb-1" />
                <span className="text-[10px]">No Photo</span>
              </div>
            )}

            {/* Top Plate Badge */}
            <div className="absolute top-2 left-2">
              <span className="font-mono text-[10px] font-bold bg-carbon/90 backdrop-blur-xs border border-steel px-1.5 py-0.5 rounded text-cream shadow-xs">
                {v.registration}
              </span>
            </div>

            {/* Top Right Status */}
            <div className="absolute top-2 right-2">
              {getReasonBadge(v.reasonType)}
            </div>
          </div>

          {/* Vehicle Body Content */}
          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-sans font-semibold text-xs text-cream truncate">
                {v.make} {v.model}
              </div>
              {v.variant && (
                <div className="text-[11px] text-pewter truncate mt-0.5">{v.variant}</div>
              )}
              <div className="text-xs text-cream font-medium mt-1.5 flex items-center gap-1.5">
                <span className="text-pewter text-[11px] leading-tight">{v.reason}</span>
              </div>
            </div>

            {/* Financial Ledger & Link */}
            <div className="pt-2 border-t border-steel flex items-center justify-between">
              <div>
                {v.askingPrice && (
                  <div className="text-xs font-bold text-cream tabular-nums">
                    {formatCurrency(v.askingPrice)} <span className="text-[10px] text-pewter font-normal">retail</span>
                  </div>
                )}
                {canViewMargin && v.investedCost && (
                  <div className="text-[10px] text-pewter tabular-nums">
                    Inv: {formatCurrency(v.investedCost)}
                  </div>
                )}
              </div>

              <Link
                href={v.actionUrl}
                className="text-xs text-cream font-medium flex items-center gap-1 hover:underline group-hover:text-blue transition-colors"
              >
                <span>Review</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
