'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Inbox, 
  Brain, 
  BarChart2, 
  Settings, 
  CreditCard,
  LogOut,
  User
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

const navItems = [
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Stock', icon: Car, href: '/stock', badge: 'stockCount' },
      { label: 'Leads', icon: Inbox, href: '/leads', badge: 'leadCount' },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Command Centre', icon: Brain, href: '/command-centre', badge: 'isNewSignal' },
      { label: 'Analytics', icon: BarChart2, href: '/analytics' },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Settings', icon: Settings, href: '/settings' },
      { label: 'Billing', icon: CreditCard, href: '/settings?tab=billing' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [dealership, setDealership] = useState<any>(null);
  const [counts, setCounts] = useState({ stockCount: 35, leadCount: 12 });

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, dealerships(*)')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setDealership(profile.dealerships);
          setUser({ ...user, full_name: profile.full_name, role: profile.role });
        }
      }
    }
    getProfile();
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
          {dealership?.name || 'Loading Dealership...'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            dealership?.subscription_status === 'active' ? "bg-positive" : "bg-blue"
          )} />
          <span className="font-mono text-[10px] text-pewter uppercase tracking-wider">
            {dealership?.subscription_tier || 'Elite'} Plan · {dealership?.subscription_status || 'Active'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((section) => (
          <div key={section.label} className="mb-6">
            <h3 className="px-6 mb-2 font-mono text-[10px] text-muted uppercase tracking-[0.16em]">
              {section.label}
            </h3>
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 rounded-[2px] transition-colors group",
                      isActive 
                        ? "bg-blue/5 text-cream border-l-2 border-blue" 
                        : "text-silver hover:bg-asphalt hover:text-cream"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={cn(isActive ? "text-blue" : "text-pewter group-hover:text-silver")} />
                      <span className="font-inter text-[13px] font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <Badge variant={isActive ? "blue" : "outline"} className="h-4 px-1.5 font-mono text-[9px]">
                        {item.badge === 'isNewSignal' ? 'NEW' : counts[item.badge as keyof typeof counts]}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Trial Banner (if trialing) */}
      {dealership?.subscription_status === 'trialing' && (
        <div className="mx-2 mb-2 p-3 bg-asphalt border border-warning rounded-[2px]">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="warning" className="text-[9px]">Trial</Badge>
            <span className="font-inter text-[11px] text-silver">12 days remaining</span>
          </div>
          <Link href="/settings?tab=billing" className="font-syne font-bold text-[10px] text-blue hover:underline uppercase tracking-wider">
            Upgrade now →
          </Link>
        </div>
      )}

      {/* User Panel */}
      <div className="p-4 border-top border-steel bg-carbon flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-steel flex items-center justify-center text-blue font-mono text-[11px]">
            {user?.full_name ? getInitials(user.full_name) : <User size={14} />}
          </div>
          <div className="overflow-hidden">
            <p className="font-inter font-medium text-[13px] text-cream truncate">
              {user?.full_name || 'Loading...'}
            </p>
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider truncate">
              {user?.role || 'Sales'}
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
