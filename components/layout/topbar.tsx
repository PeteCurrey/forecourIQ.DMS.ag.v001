'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Search, LogOut, Settings, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'
import ThemeToggle from './theme-toggle'

interface CurrentUser {
  id: string
  email?: string
  full_name?: string
  role?: string
}

export default function Topbar() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single()

      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        role: profile?.role || 'user',
      })
    }

    loadUser()

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const userInitials = user?.full_name ? getInitials(user.full_name) : user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'

  return (
    <header className="h-[56px] border-b border-steel/60 bg-void/90 backdrop-blur-xs flex items-center justify-between px-6 sticky top-0 z-30">
      
      {/* Global Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter group-focus-within:text-blue transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search stock, leads, customers..."
            className="w-full bg-carbon border border-steel h-8 pl-8.5 pr-4 rounded-[2px] font-inter text-xs text-cream placeholder:text-pewter focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        
        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle />

        {/* Notifications */}
        <button 
          className="relative p-1.5 text-pewter hover:text-cream transition-colors rounded-[2px] hover:bg-asphalt"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue rounded-full" />
        </button>

        {/* User Profile Avatar with Dropdown Menu */}
        <div className="relative pl-3 border-l border-steel/60" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-[2px] hover:bg-asphalt transition-colors focus:outline-none cursor-pointer"
            aria-expanded={isMenuOpen}
          >
            <div className="w-6.5 h-6.5 rounded-full bg-asphalt border border-steel flex items-center justify-center text-cream font-inter font-semibold text-[11px] tracking-wider">
              {userInitials}
            </div>
            <span className="hidden sm:inline font-inter text-xs text-silver font-medium max-w-[130px] truncate">
              {user?.full_name || 'Account'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-carbon border border-steel rounded-[2px] shadow-lg py-1.5 z-50 font-inter text-xs divide-y divide-steel/60">
              <div className="px-3 py-2">
                <p className="font-medium text-cream truncate">{user?.full_name || 'Dealer User'}</p>
                <p className="text-[11px] text-pewter font-mono truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[9px] font-mono uppercase bg-blue/10 text-blue px-1.5 py-0.5 rounded-[2px]">
                  {user?.role || 'Admin'}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-silver hover:text-cream hover:bg-asphalt transition-colors"
                >
                  <Settings size={13} className="text-pewter" />
                  Dealership Settings
                </Link>
                <Link
                  href="/settings/intelligence"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-silver hover:text-cream hover:bg-asphalt transition-colors"
                >
                  <Shield size={13} className="text-pewter" />
                  Intelligence Strategy
                </Link>
              </div>

              <div className="py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  )
}
