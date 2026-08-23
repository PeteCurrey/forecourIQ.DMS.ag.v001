'use client';

import Link from 'next/link';
import { Calendar, CheckSquare, Handshake, Car, ChevronRight, MapPin, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayTimelineItem {
  id: string;
  type: 'appointment' | 'task' | 'handover';
  time: string;
  title: string;
  subtitle: string;
  locationName?: string;
  imageUrl?: string | null;
  linkUrl: string;
}

interface TodayTimelineProps {
  items: TodayTimelineItem[];
}

export default function TodayTimeline({ items }: TodayTimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-xl p-8 text-center text-xs text-pewter">
        No scheduled appointments, handovers, or priority tasks due today.
      </div>
    );
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'handover':
        return (
          <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <Handshake className="w-3 h-3" />
            <span>Handover</span>
          </span>
        );
      case 'appointment':
        return (
          <span className="text-[10px] uppercase font-mono font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-full border border-blue/30 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Test Drive</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />
            <span>Priority Task</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-steel pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue animate-ping" />
          <div>
            <h2 className="text-sm font-bold text-cream tracking-tight">Today's Operating Timeline</h2>
            <p className="text-xs text-pewter">Chronological customer appointments, delivery handovers, and appraisal slots</p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-cream bg-asphalt border border-steel px-2.5 py-1 rounded-md">
          {items.length} ACTIVE SLOTS
        </span>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue before:via-steel before:to-steel">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {/* Pulsing Timeline Node */}
            <div className="absolute -left-6 top-3.5 w-3.5 h-3.5 rounded-full bg-carbon border-2 border-blue group-hover:bg-blue group-hover:scale-125 transition-all duration-300 shadow-sm" />

            <div className="bg-asphalt/40 border border-steel/70 hover:border-cream/50 rounded-xl p-4 transition-all duration-200 hover:shadow-md flex items-center justify-between gap-4">
              
              {/* Left: Thumbnail, Time & Event Details */}
              <div className="flex items-center gap-4 min-w-0">
                {/* High-res Vehicle Thumbnail */}
                <div className="w-16 h-12 rounded-lg bg-asphalt border border-steel overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <Car className="w-5 h-5 text-pewter" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-mono text-xs font-bold text-cream tabular-nums bg-carbon border border-steel px-2 py-0.5 rounded">
                      {item.time}
                    </span>
                    {getEventBadge(item.type)}
                    <span className="text-sm font-bold text-cream truncate">{item.title}</span>
                  </div>
                  <p className="text-xs text-pewter truncate font-medium">{item.subtitle}</p>
                  {item.locationName && (
                    <div className="flex items-center gap-1.5 text-[11px] text-pewter/80 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-blue" />
                      <span>{item.locationName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Quick Action Link */}
              <Link
                href={item.linkUrl}
                className="px-3 py-1.5 rounded-lg bg-carbon border border-steel hover:bg-cream hover:text-void text-xs font-semibold text-cream transition-all shrink-0 flex items-center gap-1 group-hover:border-cream/40"
              >
                <span>Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
