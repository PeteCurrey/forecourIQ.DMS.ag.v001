import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ChevronLeft, ArrowUpRight, Plus, CheckCircle, Clock } from 'lucide-react'

export const metadata = {
  title: 'Content Pages & Legal | ForecourIQ DMS',
}

export default async function WebsitePagesListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const { data: pages } = await supabase
    .from('website_pages')
    .select('*')
    .eq('dealership_id', profile.dealership_id)
    .order('created_at', { ascending: true })

  const defaultStandardPages = [
    { slug: 'used-cars', title: 'Used Cars Inventory', type: 'used_cars', status: 'published' },
    { slug: 'finance', title: 'Car Finance & Credit Brokerage', type: 'finance', status: 'published' },
    { slug: 'part-exchange', title: 'Part Exchange Online Valuation', type: 'part_exchange', status: 'published' },
    { slug: 'sell-your-car', title: 'Sell Your Car Directly', type: 'sell_your_car', status: 'published' },
    { slug: 'about', title: 'About Our Dealership', type: 'about', status: 'published' },
    { slug: 'contact', title: 'Showroom Location & Contact', type: 'contact', status: 'published' },
    { slug: 'privacy', title: 'Privacy Policy (UK GDPR)', type: 'privacy', status: 'published' },
    { slug: 'cookies', title: 'Cookie Policy', type: 'cookies', status: 'published' },
    { slug: 'terms', title: 'Terms & Conditions', type: 'terms', status: 'published' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
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
          Website Pages & Legal CMS
        </h1>
        <p className="text-xs text-muted-foreground">
          Core content, showroom service pages, and statutory consumer legal policies.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Standard Dealer Pages ({defaultStandardPages.length})</span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {defaultStandardPages.map((page) => (
            <div
              key={page.slug}
              className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{page.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded">
                    /{page.slug}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  Type: {page.type.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                  Live & Active
                </span>
                <Link
                  href={`/${page.slug}`}
                  target="_blank"
                  className="p-1.5 text-muted-foreground hover:text-white transition-colors rounded-lg hover:bg-secondary"
                  title="View live page"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
