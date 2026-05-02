'use client'

import { Bell, Search, User, LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDealership } from '@/hooks/use-dealership'
import { getInitials } from '@/lib/utils'

export default function Topbar() {
  const router = useRouter()
  const supabase = createClient()
  const { data: dealership } = useDealership()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-[72px] border-b border-steel bg-void flex items-center justify-between px-8 sticky top-0 z-30">
      
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter group-focus-within:text-blue transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search stock, leads, or command centre..."
            className="w-full bg-carbon border border-steel h-10 pl-10 pr-4 rounded-[2px] font-inter text-[13px] text-cream placeholder:text-pewter focus:outline-none focus:border-blue transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        
        {/* Dealership Info */}
        <div className="flex flex-col items-end mr-4">
          <span className="font-syne font-bold text-[13px] text-cream uppercase tracking-wider">{dealership?.name || 'HARTWELL MOTOR GROUP'}</span>
          <span className="font-mono text-[9px] text-blue uppercase tracking-widest">{dealership?.subscription_tier || 'ELITE'} PLAN · ACTIVE</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-pewter hover:text-cream transition-colors group">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue rounded-full border-2 border-void group-hover:scale-110 transition-transform" />
        </button>

        {/* User Profile / Menu */}
        <div className="flex items-center gap-3 pl-6 border-l border-steel">
          <div className="w-9 h-9 rounded-full bg-asphalt border border-steel flex items-center justify-center text-cream font-syne font-bold text-[11px] uppercase">
            {dealership ? getInitials(dealership.name) : 'HW'}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/settings')}
              className="p-2 text-pewter hover:text-cream transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={handleSignOut}
              className="p-2 text-pewter hover:text-negative transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

      </div>

    </header>
  )
}
