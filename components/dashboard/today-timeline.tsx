'use client';

import Link from 'next/link';
import { Calendar, CheckSquare, Handshake, Car, ChevronRight, MapPin } from 'lucide-react';
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
      <div className="bg-carbon border border-steel rounded-lg p-6 text-center text-xs text-pewter">
        No scheduled appointments, handovers, or priority tasks due today.
      </div>
    );
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'handover': return <span className="text-[9px] uppercase font-mono font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Handover</span>;
      case 'appointment': return <span className="text-[9px] uppercase font-mono font-semibold text-blue bg-blue-tint px-1.5 py-0.2 rounded border border-blue/20">Appointment</span>;
      default: return <span className="text-[9px] uppercase font-mono font-semibold text-pewter bg-asphalt px-1.5 py-0.2 rounded border border-steel">Task</span>;
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-steel pb-3">
        <div>
          <h2 className="text-sm font-semibold text-cream">Today's Agenda</h2>
          <p className="text-xs text-pewter">Chronological operational timeline for today's trade</p>
        </div>
        <span className="font-mono text-[10px] text-pewter bg-asphalt px-2 py-0.5 rounded">
          {items.length} ACTIONS
        </span>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-steel">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {/* Timeline node circle */}
            <div className="absolute -left-4 top-2.5 w-3 h-3 rounded-full bg-asphalt border-2 border-cream/40 group-hover:border-cream transition-colors" />

            <div className="bg-asphalt/40 border border-steel/60 hover:border-cream/30 rounded-lg p-3 transition-colors flex items-center justify-between gap-3">
              
              {/* Left: Thumbnail & Details */}
              <div className="flex items-center gap-3 min-w-0">
                {/* 48x40px thumbnail with 1.025x zoom on hover */}
                <div className="w-12 h-10 rounded bg-asphalt border border-steel overflow-hidden shrink-0 flex items-center justify-center relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <Car className="w-4 h-4 text-pewter" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] font-semibold text-cream tabular-nums">{item.time}</span>
                    {getEventBadge(item.type)}
                    <span className="text-xs font-semibold text-cream truncate">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-pewter truncate">{item.subtitle}</p>
                  {item.locationName && (
                    <div className="flex items-center gap-1 text-[10px] text-pewter mt-0.5">
                      <MapPin className="w-3 h-3 text-pewter" />
                      <span>{item.locationName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Deep Link */}
              <Link
                href={item.linkUrl}
                className="p-1.5 rounded hover:bg-asphalt text-pewter hover:text-cream transition-colors shrink-0"
                title="Open details"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
