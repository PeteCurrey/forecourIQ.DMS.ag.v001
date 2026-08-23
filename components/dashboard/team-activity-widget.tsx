'use client';

import { TeamActivityEvent } from '@/lib/types/chat';
import { Users, Handshake, ArrowLeftRight, UserCheck, MessageSquare, Car, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface TeamActivityWidgetProps {
  events: TeamActivityEvent[];
}

export default function TeamActivityWidget({ events }: TeamActivityWidgetProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-carbon border border-steel rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pewter" />
          <h2 className="text-sm font-semibold text-cream">Team Activity</h2>
        </div>
        <p className="text-xs text-pewter">No recent team operational events recorded today.</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'handover': return <Handshake className="w-3.5 h-3.5 text-emerald-600" />;
      case 'transfer': return <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />;
      case 'lead_assigned': return <UserCheck className="w-3.5 h-3.5 text-blue" />;
      case 'mention': return <MessageSquare className="w-3.5 h-3.5 text-amber-600" />;
      default: return <Users className="w-3.5 h-3.5 text-pewter" />;
    }
  };

  return (
    <div className="bg-carbon border border-steel rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pewter" />
          <h2 className="text-sm font-semibold text-cream">Team Activity</h2>
        </div>
        <Link href="/team" className="text-xs text-pewter hover:text-cream underline">
          Open Team Chat →
        </Link>
      </div>

      <div className="space-y-3">
        {events.map((e) => {
          const timeAgo = formatDistanceToNow(new Date(e.timestamp), { addSuffix: true });
          return (
            <div key={e.id} className="flex items-start gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-asphalt border border-steel flex items-center justify-center shrink-0 mt-0.5">
                {getEventIcon(e.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-cream truncate">{e.title}</span>
                  <span className="text-[10px] text-pewter shrink-0 ml-2">{timeAgo}</span>
                </div>
                <p className="text-pewter mt-0.5 leading-relaxed">{e.description}</p>
                {e.linkUrl && (
                  <Link href={e.linkUrl} className="inline-flex items-center gap-1 text-[11px] text-cream hover:underline mt-1">
                    <span>View details</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
