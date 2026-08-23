import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WebsiteService } from '@/lib/services/website/website-service'
import {
  BarChart2,
  ChevronLeft,
  Eye,
  Search,
  MessageSquare,
  Car,
  CreditCard,
  Phone,
  TrendingUp,
  Activity
} from 'lucide-react'

export const metadata = {
  title: 'Website Analytics | ForecourIQ DMS',
}

export default async function WebsiteAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const from = new Date(Date.now() - 30 * 86400000).toISOString()
  const to = new Date().toISOString()

  const analytics = await WebsiteService.getAnalytics(profile.dealership_id, from, to)
  const events = analytics.events

  const kpis = [
    { label: 'Vehicle Views', count: events['vehicle_view'] || 0, icon: Eye, colour: 'text-sky-400', bg: 'bg-sky-950' },
    { label: 'Searches Run', count: events['search'] || 0, icon: Search, colour: 'text-indigo-400', bg: 'bg-indigo-950' },
    { label: 'Enquiries Submitted', count: events['enquiry_submitted'] || 0, icon: MessageSquare, colour: 'text-emerald-400', bg: 'bg-emerald-950' },
    { label: 'Part Exchange Valuations', count: events['px_submitted'] || 0, icon: Car, colour: 'text-amber-400', bg: 'bg-amber-950' },
    { label: 'Reservations Started', count: events['reservation_started'] || 0, icon: CreditCard, colour: 'text-purple-400', bg: 'bg-purple-950' },
    { label: 'Reservations Confirmed', count: events['reservation_completed'] || 0, icon: TrendingUp, colour: 'text-rose-400', bg: 'bg-rose-950' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/website"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Website Command Centre</span>
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Website Analytics & Customer Demand Signals
        </h1>
        <p className="text-xs text-muted-foreground">
          First-party telemetry captured directly from visitor browsing sessions (Last 30 Days).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-card p-5 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg ${kpi.bg} ${kpi.colour} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {kpi.count.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Conversion Funnel Summary */}
      <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-border">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Digital Retailing Conversion Funnel</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-secondary/30 rounded-xl space-y-1">
            <div className="text-xs text-muted-foreground">1. Vehicle Views</div>
            <div className="text-xl font-bold text-white">{events['vehicle_view'] || 0}</div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-xl space-y-1">
            <div className="text-xs text-muted-foreground">2. Enquiries / PX</div>
            <div className="text-xl font-bold text-emerald-400">
              {(events['enquiry_submitted'] || 0) + (events['px_submitted'] || 0)}
            </div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-xl space-y-1">
            <div className="text-xs text-muted-foreground">3. Deposit Started</div>
            <div className="text-xl font-bold text-purple-400">{events['reservation_started'] || 0}</div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-xl space-y-1">
            <div className="text-xs text-muted-foreground">4. Vehicles Reserved</div>
            <div className="text-xl font-bold text-sky-400">{events['reservation_completed'] || 0}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
