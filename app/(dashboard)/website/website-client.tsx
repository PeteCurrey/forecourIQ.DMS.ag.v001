'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Globe,
  ExternalLink,
  Paintbrush,
  Layers,
  FileText,
  Shield,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart2,
  RefreshCw,
  Send,
  Loader2,
  Car,
  Users
} from 'lucide-react'
import type { DealerWebsiteRecord } from '@/lib/services/website/website-service'
import type { WebsiteDomain } from '@/lib/services/website/domain-service'

export default function WebsiteClient({
  initialWebsite,
  domains,
  stockCount,
  leadCount,
}: {
  initialWebsite: DealerWebsiteRecord
  domains: WebsiteDomain[]
  stockCount: number
  leadCount: number
}) {
  const [website, setWebsite] = useState(initialWebsite)
  const [publishing, setPublishing] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)

  const primaryDomain = domains.find((d) => d.is_primary)?.domain || 'Not configured'
  const isLive = website.status === 'live'

  const handlePublish = async () => {
    setPublishing(true)
    setPublishMessage(null)

    try {
      const res = await fetch('/api/website/publish', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')

      setWebsite(data.website)
      setPublishMessage(`Website successfully published! (${data.slugs_backfilled} vehicle URLs prepared)`)
    } catch (err: any) {
      setPublishMessage(`Publish error: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-500 uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>Dealer Website Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Website Command Centre
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your customer-facing digital showroom, stock presentation, branding and lead conversion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 text-xs font-semibold text-white bg-secondary/80 hover:bg-secondary rounded-lg border border-border transition-colors flex items-center gap-1.5"
          >
            <span>Preview Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isLive ? 'Republish Live Site' : 'Publish Website'}</span>
          </button>
        </div>
      </div>

      {publishMessage && (
        <div className="p-3 bg-sky-950/40 border border-sky-800 rounded-xl text-xs text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
          <span>{publishMessage}</span>
        </div>
      )}

      {/* KPI / Status Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div className="bg-card p-4 rounded-xl border border-border space-y-2">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Website Status</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isLive
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {website.status.toUpperCase()}
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {isLive ? 'Public Showroom Live' : 'Draft / Unpublished'}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {website.published_at
                ? `Last published ${new Date(website.published_at).toLocaleDateString()}`
                : 'Never published'}
            </span>
          </div>
        </div>

        {/* Live Stock */}
        <div className="bg-card p-4 rounded-xl border border-border space-y-2">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Live Web Stock</span>
            <Car className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stockCount}</div>
          <div className="text-[11px] text-muted-foreground">
            Vehicles marked website ready & advertised
          </div>
        </div>

        {/* Website Leads */}
        <div className="bg-card p-4 rounded-xl border border-border space-y-2">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Website Enquiries</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{leadCount}</div>
          <div className="text-[11px] text-muted-foreground">
            Enquiries captured directly from website
          </div>
        </div>

        {/* Domain */}
        <div className="bg-card p-4 rounded-xl border border-border space-y-2">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Custom Domain</span>
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-white truncate font-mono">
            {primaryDomain}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {domains.length} domain{domains.length === 1 ? '' : 's'} linked
          </div>
        </div>
      </div>

      {/* Navigation Quick Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Branding */}
        <Link
          href="/website/branding"
          className="group bg-card hover:bg-secondary/40 p-5 rounded-2xl border border-border transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Paintbrush className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-sky-400 transition-colors flex items-center justify-between">
              <span>Theme & Branding</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Configure dealership logos, brand colours, typography pairings and theme styling.
            </p>
          </div>
        </Link>

        {/* Homepage Editor */}
        <Link
          href="/website/editor"
          className="group bg-card hover:bg-secondary/40 p-5 rounded-2xl border border-border transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              <span>Homepage Section Editor</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Organize homepage blocks: hero headline, featured inventory, proposition points and CTAs.
            </p>
          </div>
        </Link>

        {/* Content Pages */}
        <Link
          href="/website/pages"
          className="group bg-card hover:bg-secondary/40 p-5 rounded-2xl border border-border transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors flex items-center justify-between">
              <span>Pages & Legal CMS</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Manage About Us, Finance, Part Exchange, Sell Your Car and statutory legal compliance pages.
            </p>
          </div>
        </Link>

        {/* Custom Domains */}
        <Link
          href="/website/domains"
          className="group bg-card hover:bg-secondary/40 p-5 rounded-2xl border border-border transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors flex items-center justify-between">
              <span>Domains & SSL</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Connect custom dealer domains (e.g. smithmotors.co.uk), check DNS and manage redirects.
            </p>
          </div>
        </Link>

        {/* URL Redirects */}
        <Link
          href="/website/redirects"
          className="group bg-card hover:bg-secondary/40 p-5 rounded-2xl border border-border transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors flex items-center justify-between">
              <span>301 URL Redirects</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Preserve legacy SEO equity during platform migration by mapping old website URLs.
            </p>
          </div>
        </Link>

        {/* First-Party Analytics */}
        <Link
          href="/website/analytics"
          className="group bg-card hover:bg-secondary/40 p-5 rounded-2xl border border-border transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm group-hover:text-rose-400 transition-colors flex items-center justify-between">
              <span>Website Analytics</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Review visitor traffic, top vehicle views, search keywords and lead conversion rates.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
