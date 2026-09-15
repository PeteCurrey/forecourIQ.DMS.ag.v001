'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Handshake, 
  ShoppingBag, 
  BarChart2, 
  Settings, 
  Search, 
  LogOut, 
  Shield, 
  Layers, 
  Menu, 
  X, 
  User,
  Users,
  CheckSquare,
  Calendar,
  Wrench,
  Globe,
  Inbox,
  MessageSquare,
  ArrowLeftRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials } from '@/lib/utils';
import ThemeToggle from './theme-toggle';
import NotificationDropdown from './notification-dropdown';

interface CurrentUser {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
}

interface DealershipProfile {
  name: string;
  city?: string;
  subscription_tier?: string;
}

export default function DashboardTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [dealership, setDealership] = useState<DealershipProfile | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const modulesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, dealerships(name, city, subscription_tier)')
        .eq('id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        role: profile?.role || 'sales',
      });

      if (profile?.dealerships) {
        setDealership(profile.dealerships as any);
      }
    }

    loadData();

    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (modulesMenuRef.current && !modulesMenuRef.current.contains(event.target as Node)) {
        setIsModulesOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/stock?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const primaryNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Stock', href: '/stock', icon: Car },
    { label: 'Sales', href: '/deals', icon: Handshake },
    { label: 'Sourcing', href: '/intelligence/buying', icon: ShoppingBag },
    { label: 'Reports', href: '/analytics', icon: BarChart2 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const allModules = [
    { label: 'Leads & CRM', href: '/leads', icon: Users, desc: 'Enquiries, follow-ups & pipeline' },
    { label: 'Vehicle Preparation', href: '/stock/preparation', icon: Wrench, desc: 'Inspection, MOT & PDI workflows' },
    { label: 'Stock Transfers', href: '/stock/transfers', icon: ArrowLeftRight, desc: 'Multi-site transit tracking' },
    { label: 'Dealer Website', href: '/website', icon: Globe, desc: 'Public forecourt portal' },
    { label: 'Team Chat', href: '/team', icon: MessageSquare, desc: 'Internal operational discussion' },
    { label: 'Customer Inbox', href: '/inbox', icon: Inbox, desc: 'Multichannel customer communications' },
    { label: 'Tasks & Reminders', href: '/tasks', icon: CheckSquare, desc: 'Operational to-do ledger' },
    { label: 'Appointments', href: '/appointments', icon: Calendar, desc: 'Test drives & customer handovers' },
  ];

  const userInitials = user?.full_name ? getInitials(user.full_name) : 'U';

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-surface/90 backdrop-blur-md transition-colors">
      <div className="max-w-[1720px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        
        {/* LEFT: Dealership Logo & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border bg-surface-raised focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1 outline-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow-primary">
              <span className="font-sans font-black text-white text-xs tracking-wider">FIQ</span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-text-primary text-sm tracking-tight leading-none">
                Forecour<span className="text-primary">IQ</span>
              </span>
              <span className="text-[11px] font-sans font-medium text-text-secondary truncate max-w-[150px] sm:max-w-[190px] leading-tight mt-0.5">
                {dealership?.name || 'Dealership Management'}
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER: Primary Nav Icons */}
        <nav
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised/80 border border-border/80 shadow-xs"
          aria-label="Main Navigation"
        >
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all duration-150 outline-hidden',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-surface',
                  isActive
                    ? 'bg-primary text-white shadow-glow-primary font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface/80'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-text-secondary')} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* All Modules Dropdown Launcher */}
          <div className="relative" ref={modulesMenuRef}>
            <button
              onClick={() => setIsModulesOpen(!isModulesOpen)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-body-sm font-semibold transition-all duration-150 outline-hidden',
                'text-text-secondary hover:text-text-primary hover:bg-surface/80 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                isModulesOpen && 'bg-surface text-text-primary'
              )}
              title="All DMS Modules"
              aria-expanded={isModulesOpen}
            >
              <Layers className="w-4 h-4 text-primary" />
              <span className="hidden lg:inline text-caption font-bold uppercase tracking-wider text-text-muted">More</span>
            </button>

            {isModulesOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-surface-raised border border-border rounded-xl shadow-2xl p-2 z-50 animate-fade-in divide-y divide-border/60">
                <div className="px-3 py-2 text-caption font-mono uppercase font-bold text-text-muted">
                  Operational Modules
                </div>
                <div className="py-1 grid grid-cols-1 gap-1">
                  {allModules.map((mod) => {
                    const ModIcon = mod.icon;
                    return (
                      <Link
                        key={mod.href}
                        href={mod.href}
                        onClick={() => setIsModulesOpen(false)}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors group outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="p-1.5 rounded-md bg-surface border border-border group-hover:border-primary/40 group-hover:text-primary transition-colors text-text-secondary">
                          <ModIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                            {mod.label}
                          </div>
                          <div className="text-[11px] text-text-secondary line-clamp-1">{mod.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* RIGHT: Search, Notifications, Theme Toggle & User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:block relative w-48 xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search VRM, VIN, leads..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-raised border border-border text-body-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary transition-all"
            />
          </form>

          {/* Theme Toggle */}
          <div className="border-r border-border pr-2">
            <ThemeToggle />
          </div>

          {/* Notifications Dropdown */}
          <NotificationDropdown />

          {/* User Profile Avatar with Dropdown */}
          <div className="relative pl-1" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-surface-raised transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-hidden cursor-pointer"
              aria-expanded={isUserMenuOpen}
              aria-label="User Account Menu"
            >
              <div className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-primary font-bold text-caption tracking-wider shadow-xs">
                {userInitials}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-body-sm font-semibold text-text-primary leading-tight truncate max-w-[120px]">
                  {user?.full_name || 'Account'}
                </span>
                <span className="text-[10px] font-mono uppercase text-primary font-bold leading-tight">
                  {user?.role?.replace('_', ' ') || 'Dealer User'}
                </span>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-raised border border-border rounded-xl shadow-2xl py-1.5 z-50 text-body-sm divide-y divide-border/60 animate-fade-in">
                <div className="px-4 py-2.5">
                  <p className="font-bold text-text-primary truncate">{user?.full_name || 'Dealer User'}</p>
                  <p className="text-caption text-text-secondary font-mono truncate">{user?.email}</p>
                  <span className="inline-block mt-1.5 text-[9px] font-mono uppercase bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">
                    {user?.role?.replace('_', ' ') || 'Staff'}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-primary" />
                    Dealership Settings
                  </Link>
                  <Link
                    href="/settings/intelligence"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Intelligence Strategy
                  </Link>
                  <Link
                    href="/design-system"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Design System QA
                  </Link>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-status-danger hover:bg-status-danger/10 transition-colors text-left font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MOBILE DRAWER NAVIGATION (Reflows on mobile / tablet) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-border px-4 py-4 space-y-4 animate-fade-in">
          {/* Mobile search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search VRM, VIN, stock..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-raised border border-border text-body-sm text-text-primary"
            />
          </form>

          {/* Primary Nav List */}
          <div className="space-y-1">
            <div className="text-caption font-mono uppercase text-text-muted px-2 mb-1 font-bold">Main Navigation</div>
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-semibold transition-colors',
                    isActive ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:bg-surface-raised'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Secondary Modules */}
          <div className="space-y-1 pt-2 border-t border-border">
            <div className="text-caption font-mono uppercase text-text-muted px-2 mb-1 font-bold">All Modules</div>
            <div className="grid grid-cols-2 gap-1">
              {allModules.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-caption text-text-secondary hover:text-text-primary hover:bg-surface-raised truncate font-medium"
                >
                  {mod.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
