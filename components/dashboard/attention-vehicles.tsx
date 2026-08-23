'use client';

import { AttentionVehicle } from '@/lib/services/dashboard/dashboard-service';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Car, ChevronRight, AlertTriangle, Clock, Tag, Wrench, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface AttentionVehiclesProps {
  vehicles: AttentionVehicle[];
  canViewMargin: boolean;
}

export default function AttentionVehicles({ vehicles, canViewMargin }: AttentionVehiclesProps) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-lg p-6 text-center text-xs text-pewter">
        No vehicles currently require urgent attention.
      </div>
    );
  }

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'prep': return <Wrench className="w-3.5 h-3.5 text-amber-600" />;
      case 'ageing': return <Clock className="w-3.5 h-3.5 text-red-600" />;
      case 'pricing': return <Tag className="w-3.5 h-3.5 text-blue" />;
      case 'transfer': return <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />;
      default: return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-2">
      {vehicles.map((v) => (
        <div
          key={v.id}
          className="bg-carbon border border-steel rounded-lg p-3 hover:border-cream/30 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3.5"
        >
          {/* 90-110px Vehicle Image Thumbnail */}
          <div className="w-24 h-16 sm:w-28 sm:h-18 bg-asphalt rounded border border-steel overflow-hidden relative shrink-0 flex items-center justify-center">
            {v.imageUrl ? (
              <img
                src={v.imageUrl}
                alt={`${v.make} ${v.model}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Car className="w-6 h-6 text-pewter" />
            )}
          </div>

          {/* Vehicle Identity & Reason */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] font-medium bg-asphalt border border-steel px-1.5 py-0.5 rounded text-cream">
                {v.registration}
              </span>
              <span className="text-[11px] text-pewter capitalize">
                {v.daysInStock}d in stock
              </span>
            </div>

            <div className="text-[13px] font-medium text-cream truncate">
              {v.make} {v.model} {v.variant && <span className="text-pewter text-xs font-normal">· {v.variant}</span>}
            </div>

            <div className="flex items-center gap-1.5 text-xs mt-1">
              {getReasonIcon(v.reasonType)}
              <span className="text-cream font-medium truncate">{v.reason}</span>
            </div>
          </div>

          {/* Financials & Action */}
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-steel">
            <div className="text-left sm:text-right">
              {v.askingPrice && (
                <div className="text-[13px] font-semibold text-cream tabular-nums">
                  {formatCurrency(v.askingPrice)}
                </div>
              )}
              {canViewMargin && v.investedCost && (
                <div className="text-[11px] text-pewter tabular-nums">
                  Inv: {formatCurrency(v.investedCost)}
                </div>
              )}
            </div>

            <Link
              href={v.actionUrl}
              className="p-1.5 rounded-full hover:bg-asphalt text-pewter hover:text-cream transition-colors"
              title="Review vehicle"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
