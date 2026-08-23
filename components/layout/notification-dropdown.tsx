'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, ChevronRight, Info } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { DealershipNotification } from '@/lib/types/notifications';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  sales: 'Sales',
  stock: 'Stock',
  deals: 'Deals',
  transfers: 'Transfers',
  team: 'Team',
  compliance: 'Compliance',
  iq: 'Intelligence',
  system: 'System',
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<DealershipNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silent fail — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll every 60s for new notifications
  useEffect(() => {
    const timer = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const todayNotifications = notifications.filter(n => {
    const today = new Date();
    const created = new Date(n.created_at);
    return created.toDateString() === today.toDateString();
  });
  const earlierNotifications = notifications.filter(n => {
    const today = new Date();
    const created = new Date(n.created_at);
    return created.toDateString() !== today.toDateString();
  });

  const getPriorityIndicator = (priority: string) => {
    if (priority === 'critical') return 'w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5';
    if (priority === 'high') return 'w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-1.5';
    return 'w-1.5 h-1.5 bg-blue rounded-full shrink-0 mt-1.5';
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifications(); }}
        className="relative p-1.5 text-pewter hover:text-cream transition-colors rounded hover:bg-asphalt"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 w-2 h-2 bg-blue rounded-full border border-carbon"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Notification Panel Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-carbon border border-steel rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[480px] animate-fade-in">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-steel shrink-0">
            <h3 className="text-xs font-semibold text-cream tracking-wide">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-pewter hover:text-cream transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-pewter hover:text-cream transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-5 text-xs text-pewter text-center">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-6 h-6 text-pewter/40 mx-auto mb-2" />
                <p className="text-xs text-pewter">No notifications yet.</p>
                <p className="text-[11px] text-pewter/60 mt-0.5">Events from leads, stock, and transfers will appear here.</p>
              </div>
            ) : (
              <>
                {todayNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-pewter bg-asphalt/50 border-b border-steel/40">
                      Today
                    </div>
                    {todayNotifications.map(n => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                        onClose={() => setOpen(false)}
                        getPriorityIndicator={getPriorityIndicator}
                      />
                    ))}
                  </div>
                )}
                {earlierNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-pewter bg-asphalt/50 border-b border-steel/40">
                      Earlier
                    </div>
                    {earlierNotifications.map(n => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                        onClose={() => setOpen(false)}
                        getPriorityIndicator={getPriorityIndicator}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer link */}
          <div className="px-4 py-2.5 border-t border-steel shrink-0">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-[11px] text-pewter hover:text-cream transition-colors underline"
            >
              Notification preferences →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onMarkRead,
  onClose,
  getPriorityIndicator,
}: {
  notification: DealershipNotification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
  getPriorityIndicator: (p: string) => string;
}) {
  const isUnread = !n.read_at;
  const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

  const inner = (
    <div
      className={cn(
        'flex items-start gap-2.5 px-4 py-3 border-b border-steel/40 transition-colors',
        isUnread ? 'bg-blue/5 hover:bg-blue/10' : 'hover:bg-asphalt/60'
      )}
    >
      {/* Priority Dot */}
      <span className={getPriorityIndicator(n.priority)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-mono font-semibold uppercase text-pewter">
            {CATEGORY_LABELS[n.category] || n.category}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-pewter shrink-0">{timeAgo}</span>
            {isUnread && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onMarkRead(n.id); }}
                className="text-pewter hover:text-cream transition-colors"
                title="Mark as read"
              >
                <Check className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <p className={cn('text-xs font-semibold', isUnread ? 'text-cream' : 'text-silver')}>
          {n.title}
        </p>
        <p className="text-[11px] text-pewter line-clamp-2 mt-0.5 leading-relaxed">{n.body}</p>
      </div>
    </div>
  );

  if (n.link_url) {
    return (
      <Link href={n.link_url} onClick={() => { onMarkRead(n.id); onClose(); }}>
        {inner}
      </Link>
    );
  }

  return <div onClick={() => isUnread && onMarkRead(n.id)}>{inner}</div>;
}
