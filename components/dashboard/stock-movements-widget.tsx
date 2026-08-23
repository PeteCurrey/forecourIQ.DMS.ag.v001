'use client';

import { StockMovementsSummary } from '@/lib/types/transfers';
import { ArrowLeftRight, Clock, AlertTriangle, Car } from 'lucide-react';
import Link from 'next/link';

interface StockMovementsWidgetProps {
  movements?: StockMovementsSummary;
}

export default function StockMovementsWidget({ movements }: StockMovementsWidgetProps) {
  if (!movements || (movements.inboundCount === 0 && movements.outboundCount === 0 && movements.activeTransfers.length === 0)) {
    return null;
  }

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-pewter" />
          <h2 className="text-sm font-semibold text-cream">Stock Movements</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-pewter">
          <span className="bg-asphalt px-2 py-0.5 rounded font-medium text-cream">
            {movements.inboundCount} Inbound
          </span>
          <span className="bg-asphalt px-2 py-0.5 rounded font-medium text-cream">
            {movements.outboundCount} Outbound
          </span>
          <Link href="/stock/transfers" className="text-pewter hover:text-cream underline ml-1">
            All →
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {movements.activeTransfers.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between p-2.5 rounded bg-asphalt/60 border border-steel text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-8 rounded bg-asphalt border border-steel overflow-hidden shrink-0 flex items-center justify-center">
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.vehicleName} className="w-full h-full object-cover" />
                ) : (
                  <Car className="w-3.5 h-3.5 text-pewter" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-cream truncate">
                  {t.vehicleName} <span className="font-mono text-[10px] text-pewter">({t.registration})</span>
                </div>
                <div className="text-[11px] text-pewter flex items-center gap-1 mt-0.5">
                  <span>{t.originName}</span>
                  <span>→</span>
                  <span className="font-medium text-cream">{t.destinationName}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="capitalize text-[11px] px-2 py-0.5 rounded-full bg-steel text-cream">
                {t.status.replace('_', ' ')}
              </span>
              {t.isOverdue ? (
                <div className="text-[10px] text-red-600 font-medium flex items-center gap-1 justify-end mt-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </div>
              ) : t.eta ? (
                <div className="text-[10px] text-pewter flex items-center gap-1 justify-end mt-1">
                  <Clock className="w-3 h-3" /> {new Date(t.eta).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
