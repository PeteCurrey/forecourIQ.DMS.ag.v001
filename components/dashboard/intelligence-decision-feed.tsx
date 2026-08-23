'use client';

import { IntelligenceItem } from '@/lib/services/dashboard/dashboard-service';
import { Sparkles, Tag, ShoppingCart, Landmark, ArrowRight, Car, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IntelligenceDecisionFeedProps {
  items: IntelligenceItem[];
}

export default function IntelligenceDecisionFeed({ items }: IntelligenceDecisionFeedProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-xl p-8 text-center text-xs text-pewter">
        No active intelligence signals or pricing recommendations right now.
      </div>
    );
  }

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'BUYING':
        return {
          icon: ShoppingCart,
          label: 'BUYING OPPORTUNITY',
          badge: 'text-blue bg-blue/10 border-blue/30',
          btn: 'bg-blue text-white hover:bg-blue-600',
        };
      case 'PRICING':
        return {
          icon: Tag,
          label: 'PRICING ADJUSTMENT',
          badge: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
          btn: 'bg-amber-600 text-white hover:bg-amber-700',
        };
      default:
        return {
          icon: Landmark,
          label: 'CAPITAL EFFICIENCY',
          badge: 'text-purple-600 bg-purple-500/10 border-purple-500/30',
          btn: 'bg-purple-600 text-white hover:bg-purple-700',
        };
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-steel pb-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-blue" />
          <div>
            <h2 className="text-sm font-bold text-cream tracking-tight">Intelligence & Decision Feed</h2>
            <p className="text-xs text-pewter">Actionable acquisition gaps, demand signals, and margin protection</p>
          </div>
        </div>
        <Link href="/command-centre" className="text-xs font-bold text-blue hover:underline flex items-center gap-1">
          <span>Command Centre</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Decision Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item) => {
          const theme = getCategoryTheme(item.category);
          const Icon = theme.icon;

          return (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-asphalt/40 border border-steel/70 hover:border-cream/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden"
            >
              <div>
                {/* Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('flex items-center gap-1.5 text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border', theme.badge)}>
                    <Icon className="w-3 h-3" />
                    <span>{theme.label}</span>
                  </span>
                </div>

                {/* Vehicle Thumbnail & Title */}
                <div className="flex items-start gap-3">
                  {item.imageUrl && (
                    <div className="w-14 h-11 rounded-lg bg-asphalt border border-steel overflow-hidden shrink-0 shadow-xs relative">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-cream truncate group-hover:text-blue transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-pewter font-medium line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Evidence Body */}
                <p className="text-xs text-pewter leading-relaxed mt-3 bg-carbon/50 p-2.5 rounded-lg border border-steel/40">
                  {item.evidence}
                </p>
              </div>

              {/* Footer Figure & CTA */}
              <div className="pt-3 border-t border-steel/60 flex items-center justify-between">
                {item.targetFigureLabel && item.targetFigureValue ? (
                  <div>
                    <span className="text-[10px] uppercase font-mono text-pewter block">{item.targetFigureLabel}</span>
                    <span className="text-sm font-bold text-cream tabular-nums">{item.targetFigureValue}</span>
                  </div>
                ) : <div />}

                <Link
                  href={item.actionUrl}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shadow-xs',
                    theme.btn
                  )}
                >
                  <span>{item.actionLabel.replace('→', '')}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
