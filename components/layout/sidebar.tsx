'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Wrench, 
  Users, 
  Inbox, 
  CheckSquare, 
  Calendar, 
  Brain, 
  BarChart2, 
  Settings, 
  CreditCard, 
  LogOut, 
  User, 
  Handshake, 
  Layers, 
  Link2, 
  Globe, 
  ShoppingBag, 
  Tag, 
  Eye, 
  FileText, 
  ShieldCheck, 
  Shield, 
  MessageCircle, 
  Rocket, 
  MonitorDot,
  MessageSquare,
  ArrowLeftRight
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FeedbackModal from '@/components/feedback/feedback-modal';

interface DealershipProfile {
  name: string;
  subscription_tier: string;
  subscription_status: string;
}

interface UserInfo {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  is_platform_admin?: boolean;
}

interface NavItem {
  label: string;
  icon: any;
  href: string;
  badgeKey?: string;
  roles?: string[];
  platformAdminOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Stockbook', icon: Car, href: '/stock', badgeKey: 'stock' },
      { label: 'Stock Transfers', icon: ArrowLeftRight, href: '/stock/transfers', badgeKey: 'transfers' },
      { label: 'Dealer Website', icon: Globe, href: '/website' },
      { label: 'Advertising', icon: Layers, href: '/advertising' },
      { label: 'Preparation', icon: Wrench, href: '/stock/preparation', badgeKey: 'prep' },
      { label: 'Team Chat', icon: MessageSquare, href: '/team', badgeKey: 'chat' },
      { label: 'Inbox', icon: Inbox, href: '/inbox', badgeKey: 'inbox' },
      { label: 'Leads', icon: Users, href: '/leads', badgeKey: 'leads' },
      { label: 'Deal Desk', icon: Handshake, href: '/deals', badgeKey: 'deals' },
      { label: 'Approval Inbox', icon: ShieldCheck, href: '/actions/approvals', badgeKey: 'approvals', roles: ['admin', 'dealer_principal', 'finance'] },
      { label: 'Customers', icon: User, href: '/customers' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks', badgeKey: 'tasks' },
      { label: 'Appointments', icon: Calendar, href: '/appointments' },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Command Centre', icon: Brain, href: '/command-centre', badgeKey: 'signals' },
      { label: 'Daily Briefing', icon: FileText, href: '/command-centre/brief' },
      { label: 'Market Demand', icon: BarChart2, href: '/intelligence/market' },
      { label: 'Buying Intelligence', icon: ShoppingBag, href: '/intelligence/buying', roles: ['admin', 'dealer_principal', 'buyer', 'sales'] },
      { label: 'Pricing Attention', icon: Tag, href: '/intelligence/pricing', roles: ['admin', 'dealer_principal', 'sales'] },
      { label: 'Competitor Tracking', icon: Eye, href: '/intelligence/competitors' },
      { label: 'Analytics', icon: BarChart2, href: '/analytics', roles: ['admin', 'dealer_principal', 'sales'] },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Integrations', icon: Link2, href: '/settings/integrations', roles: ['admin', 'dealer_principal'] },
      { label: 'IQ Operating Policy', icon: Shield, href: '/settings/iq', roles: ['admin', 'dealer_principal'] },
      { label: 'Intelligence Strategy', icon: Settings, href: '/settings/intelligence', roles: ['admin', 'dealer_principal'] },
      { label: 'Settings', icon: Settings, href: '/settings' },
      { label: 'Billing & Plan', icon: CreditCard, href: '/settings/billing', roles: ['admin', 'dealer_principal'] },
      { label: 'Support', icon: MessageCircle, href: '/support' },
      { label: 'Dealership Setup', icon: Rocket, href: '/onboarding', roles: ['admin', 'dealer_principal'] },
      { label: 'Platform Console', icon: MonitorDot, href: '/platform', platformAdminOnly: true },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dealership, setDealership] = useState<DealershipProfile | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [counts, setCounts] = useState<{ 
    stock?: number; 
    prep?: number; 
    leads?: number; 
    deals?: number; 
    tasks?: number; 
    signals?: number; 
    inbox?: number; 
    approvals?: number;
    chat?: number;
    transfers?: number;
  }>({});

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, dealership_id, is_platform_admin, dealerships(name, subscription_tier, subscription_status)')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        if (profile.dealerships) {
          setDealership(profile.dealerships as any);
        }
        
        // Also verify if user is recorded in platform_operators
        const { data: operator } = await supabase
          .from('platform_operators')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .maybeSingle();

        const isPlatformAdmin = !!profile.is_platform_admin || !!operator;

        setUser({
          id: authUser.id,
          email: authUser.email,
          full_name: profile.full_name,
          role: profile.role,
          is_platform_admin: isPlatformAdmin,
        });

        if (profile.dealership_id) {
          // Fetch counts across domain tables
          const [
            stockRes, 
            prepRes, 
            leadsRes, 
            dealsRes, 
            tasksRes, 
            signalsRes, 
            inboxRes, 
            approvalsRes,
            chatMentionsRes,
            transfersRes
          ] = await Promise.all([
            supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['available', 'advertised', 'ready_for_sale']),
            supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['inspection', 'preparation', 'photography']),
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['new', 'unassigned']),
            supabase.from('deals').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['draft', 'proposal_sent', 'deposit_taken']),
            supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('status', 'open'),
            supabase.from('ai_recommendations').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('status', 'active'),
            supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('unread_count', 0),
            supabase.from('ai_actions').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('status', 'pending_approval'),
            supabase.from('internal_message_mentions').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('mentioned_user_id', authUser.id).eq('is_read', false),
            supabase.from('stock_transfers').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['requested', 'in_transit']),
          ]);

          setCounts({
            stock: stockRes.count || undefined,
            prep: prepRes.count || undefined,
            leads: leadsRes.count || undefined,
            deals: dealsRes.count || undefined,
            tasks: tasksRes.count || undefined,
            signals: signalsRes.count || undefined,
            inbox: inboxRes.count || undefined,
            approvals: approvalsRes.count || undefined,
            chat: chatMentionsRes.count || undefined,
            transfers: transfersRes.count || undefined,
          });
        }
      }
    }
    loadData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const userRole = user?.role || 'sales';
  const isPlatformAdmin = user?.is_platform_admin === true;

  return (
    <aside className="w-64 bg-carbon border-r border-steel flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-steel bg-carbon">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-cream flex items-center justify-center">
            <span className="font-sans font-bold text-void text-xs tracking-wider">FIQ</span>
          </div>
          <span className="font-sans font-semibold text-cream tracking-tight text-sm">
            Forecour<span className="text-blue">IQ</span>
          </span>
        </Link>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-asphalt text-pewter border border-steel">
          DMS
        </span>
      </div>

      {/* Dealership Banner */}
      <div className="px-5 py-3 border-b border-steel bg-asphalt/50">
        <div className="text-xs font-medium text-cream truncate">
          {dealership?.name || 'Loading Dealership...'}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block animate-pulse" />
          <span className="text-[11px] text-pewter capitalize">
            {dealership?.subscription_tier || 'Professional'} · {dealership?.subscription_status || 'Active'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => {
          // Filter items based on user role and platform admin status
          const visibleItems = section.items.filter((item) => {
            if (item.platformAdminOnly && !isPlatformAdmin) return false;
            if (item.roles && !item.roles.includes(userRole)) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-sans font-medium uppercase tracking-wider text-pewter">
                {section.label}
              </div>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const badgeCount = item.badgeKey ? (counts as any)[item.badgeKey] : undefined;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-1.5 rounded text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-asphalt text-cream font-semibold border-l-2 border-cream'
                            : 'text-pewter hover:text-cream hover:bg-asphalt/60'
                        )}
                      >
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-cream' : 'text-pewter')} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badgeCount !== undefined && badgeCount > 0 && (
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                              item.badgeKey === 'signals' || item.badgeKey === 'approvals' || item.badgeKey === 'chat'
                                ? 'bg-blue-tint text-blue border border-blue/20 font-semibold'
                                : 'bg-steel text-pewter'
                            )}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-steel bg-carbon flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-asphalt border border-steel flex items-center justify-center text-xs font-semibold text-cream shrink-0">
            {user?.full_name ? getInitials(user.full_name) : 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-medium text-cream truncate">
              {user?.full_name || 'Dealer User'}
            </div>
            <div className="text-[11px] text-pewter truncate capitalize">
              {user?.role?.replace('_', ' ') || 'Sales'}
              {isPlatformAdmin && ' · Operator'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="p-1.5 text-pewter hover:text-cream hover:bg-asphalt rounded transition-colors"
            title="Submit Feedback / Report Issue"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 text-pewter hover:text-negative hover:bg-asphalt rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        userRole={user?.role}
      />
    </aside>
  );
}
