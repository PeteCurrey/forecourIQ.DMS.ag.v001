'use client';

import { IntelligenceItem } from '@/lib/services/dashboard/dashboard-service';
import { Sparkles, Tag, ShoppingCart, Landmark, ArrowRight, Car } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IntelligenceDecisionFeedProps {
  items: IntelligenceItem[];
}

export default function IntelligenceDecisionFeed({ items }: IntelligenceDecisionFeedProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-lg p-6 text-center text-xs text-pewter">
        No active intelligence signals or pricing recommendations right now.
      </div>
    );
  }

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'BUYING':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-blue bg-blue-tint px-1.5 py-0.5 rounded border border-blue/20">
            <ShoppingCart className="w-3 h-3" />
            <span>BUYING</span>
          </span>
        );
      case 'PRICING':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            <Tag className="w-3 h-3" />
            <span>PRICING</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
            <Landmark className="w-3 h-3" />
            <span>CAPITAL</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-steel pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue" />
          <h2 className="text-sm font-semibold text-cream">Intelligence Decisions</h2>
        </div>
        <Link href="/command-centre" className="text-xs text-pewter hover:text-cream underline">
          Command Centre →
        </Link>
      </div>

      {/* Decision Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg bg-asphalt/40 border border-steel/60 hover:border-cream/40 transition-colors flex flex-col justify-between space-y-3 group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                {getCategoryBadge(item.category)}
              </div>

              <div className="flex items-start gap-2.5">
                {item.imageUrl && (
                  <div className="w-10 h-8 rounded bg-asphalt border border-steel overflow-hidden shrink-0 mt-0.5">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-cream truncate">{item.title}</div>
                  <div className="text-[11px] text-pewter font-medium line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-pewter leading-relaxed mt-2 line-clamp-2">
                {item.evidence}
              </p>
            </div>

            <div className="pt-2 border-t border-steel/60 flex items-center justify-between">
              {item.targetFigureLabel && item.targetFigureValue ? (
                <div>
                  <span className="text-[10px] text-pewter block">{item.targetFigureLabel}</span>
                  <span className="text-xs font-bold text-cream tabular-nums">{item.targetFigureValue}</span>
                </div>
              ) : <div />}

              <Link
                href={item.actionUrl}
                className="text-xs text-cream font-medium flex items-center gap-1 group-hover:text-blue transition-colors"
              >
                <span>{item.actionLabel}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
