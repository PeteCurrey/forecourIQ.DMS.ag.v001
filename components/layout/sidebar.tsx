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
  Eye
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

interface DealershipProfile {
  name: string
  subscription_tier: string
  subscription_status: string
}

interface UserInfo {
  id: string
  email?: string
  full_name?: string
  role?: string
}

const navSections = [
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Stockbook', icon: Car, href: '/stock', badgeKey: 'stock' },
      { label: 'Dealer Website', icon: Globe, href: '/website' },
      { label: 'Advertising', icon: Layers, href: '/advertising' },
      { label: 'Preparation', icon: Wrench, href: '/stock/preparation', badgeKey: 'prep' },
      { label: 'Inbox', icon: Inbox, href: '/inbox', badgeKey: 'inbox' },
      { label: 'Leads', icon: Users, href: '/leads', badgeKey: 'leads' },
      { label: 'Deal Desk', icon: Handshake, href: '/deals', badgeKey: 'deals' },
      { label: 'Customers', icon: User, href: '/customers' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks', badgeKey: 'tasks' },
      { label: 'Appointments', icon: Calendar, href: '/appointments' },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Command Centre', icon: Brain, href: '/command-centre', badgeKey: 'signals' },
      { label: 'Market Demand', icon: BarChart2, href: '/intelligence/market' },
      { label: 'Buying Intelligence', icon: ShoppingBag, href: '/intelligence/buying' },
      { label: 'Pricing Attention', icon: Tag, href: '/intelligence/pricing' },
      { label: 'Competitor Tracking', icon: Eye, href: '/intelligence/competitors' },
      { label: 'Analytics', icon: BarChart2, href: '/analytics' },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Integrations', icon: Link2, href: '/settings/integrations' },
      { label: 'Intelligence Strategy', icon: Settings, href: '/settings/intelligence' },
      { label: 'Settings', icon: Settings, href: '/settings' },
      { label: 'Billing', icon: CreditCard, href: '/settings?tab=billing' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dealership, setDealership] = useState<DealershipProfile | null>(null);
  const [counts, setCounts] = useState<{ stock?: number; prep?: number; leads?: number; deals?: number; tasks?: number; signals?: number; inbox?: number }>({});

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, dealership_id, dealerships(name, subscription_tier, subscription_status)')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        const d = profile.dealerships as unknown as DealershipProfile | null;
        if (d) setDealership(d);
        setUser({
          id: authUser.id,
          email: authUser.email,
          full_name: profile.full_name,
          role: profile.role,
        });

        if (profile.dealership_id) {
          // Fetch real counts across domain tables
          const [stockRes, prepRes, leadsRes, dealsRes, tasksRes, signalsRes, inboxRes] = await Promise.all([
            supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['available', 'advertised', 'ready_for_sale']),
            supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['inspection', 'preparation', 'photography']),
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).in('status', ['new', 'unassigned']),
            supabase.from('deals').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).not('status', 'in', '("completed","cancelled","lost")'),
            supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('status', 'open'),
            supabase.from('buying_signals').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('status', 'active'),
            supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('dealership_id', profile.dealership_id).eq('status', 'open'),
          ]);

          setCounts({
            stock: stockRes.count ?? 0,
            prep: prepRes.count ?? 0,
            leads: leadsRes.count ?? 0,
            deals: dealsRes.count ?? 0,
            tasks: tasksRes.count ?? 0,
            signals: signalsRes.count ?? 0,
            inbox: inboxRes.count ?? 0,
          });
        }
      }
    }

    loadData();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-[240px] h-screen bg-carbon border-r border-steel fixed left-0 top-0 flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-steel">
        <Link href="/dashboard" className="flex items-center gap-1">
          <span className="font-syne font-bold text-lg text-cream tracking-tight">Forecour</span>
          <span className="font-syne font-bold text-lg text-blue tracking-tight">IQ</span>
        </Link>
      </div>

      {/* Dealership Nameplate */}
      <div className="px-6 py-4 border-b border-steel">
        <p className="font-inter font-medium text-[13px] text-cream truncate">
          {dealership?.name || 'Dealership'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            dealership?.subscription_status === 'active' ? "bg-positive" : "bg-blue"
          )} />
          <span className="font-mono text-[10px] text-pewter uppercase tracking-wider">
            {dealership?.subscription_tier || 'Starter'} Plan · {dealership?.subscription_status || 'Active'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <h3 className="px-6 mb-2 font-mono text-[10px] text-muted uppercase tracking-[0.16em]">
              {section.label}
            </h3>
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = item.href === '/stock' 
                  ? pathname === '/stock'
                  : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                const badgeCount = item.badgeKey ? counts[item.badgeKey as keyof typeof counts] : undefined;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 rounded-[2px] transition-colors group",
                      isActive 
                        ? "bg-blue/5 text-cream border-l-2 border-blue font-medium" 
                        : "text-silver hover:bg-asphalt hover:text-cream"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={cn(isActive ? "text-blue" : "text-pewter group-hover:text-silver")} />
                      <span className="font-inter text-[13px]">{item.label}</span>
                    </div>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <Badge variant={isActive ? "blue" : "outline"} className="h-4 px-1.5 font-mono text-[9px]">
                        {badgeCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Panel */}
      <div className="p-4 border-t border-steel bg-carbon flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-steel flex items-center justify-center text-blue font-mono text-[11px]">
            {user?.full_name ? getInitials(user.full_name) : <User size={14} />}
          </div>
          <div className="overflow-hidden">
            <p className="font-inter font-medium text-[13px] text-cream truncate">
              {user?.full_name || 'Dealer User'}
            </p>
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider truncate">
              {user?.role || 'Admin'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-pewter hover:text-negative transition-colors"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
