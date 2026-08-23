'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_LABELS, IntegrationCategory, DealershipIntegrationWithMeta } from '@/lib/services/integrations/registry'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  Lock,
} from 'lucide-react'

export default function SettingsIntegrationsClient({
  initialIntegrations,
  dealershipId,
  userRole,
}: {
  initialIntegrations: DealershipIntegrationWithMeta[]
  dealershipId: string
  userRole?: string
}) {
  const [integrations, setIntegrations] = useState<DealershipIntegrationWithMeta[]>(initialIntegrations)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)

  // Metrics
  const connectedCount = integrations.filter((i) => i.state.status === 'connected').length
  const availableCount = integrations.filter((i) => i.state.status === 'available').length
  const credsRequiredCount = integrations.filter((i) => i.state.status === 'credentials_required').length
  const commercialRequiredCount = integrations.filter((i) => i.state.status === 'commercial_access_required').length

  // Filter list
  const filtered = integrations.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Test live connection
  const handleTestConnection = async (providerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTestingId(providerId)

    try {
      const res = await fetch(`/api/integrations/${providerId}/test`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message || 'Connection verified successfully.')
      } else {
        toast.error(data.message || 'Connection test failed.')
      }
    } catch {
      toast.error('Failed to trigger connection test.')
    } finally {
      setTestingId(null)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        )
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-blue-500/10 border border-blue-500/30 text-blue font-mono text-[10px] uppercase font-semibold">
            <Zap className="w-3 h-3 text-blue" />
            Ready To Connect
          </span>
        )
      case 'credentials_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase font-semibold">
            <Lock className="w-3 h-3 text-amber-400" />
            Credentials Required
          </span>
        )
      case 'commercial_access_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-[10px] uppercase font-semibold">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            Commercial Agreement Required
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-steel/20 border border-steel text-pewter font-mono text-[10px] uppercase font-semibold">
            Not Configured
          </span>
        )
    }
  }

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Providers' },
    { id: 'vehicle_data', label: 'Vehicle Data & Valuations' },
    { id: 'advertising', label: 'Advertising Portals' },
    { id: 'communications', label: 'Communications' },
    { id: 'finance', label: 'Finance Systems' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'payments', label: 'Payments' },
    { id: 'esignature', label: 'E-Sign & ID' },
    { id: 'acquisition', label: 'Auctions' },
  ]

  return (
    <div className="min-h-screen bg-void text-cream p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-syne tracking-tight text-cream">Integrations & Data Feeds</h1>
            <Badge variant="outline" className="font-mono text-[11px] text-pewter border-steel">
              Phase 5 Active
            </Badge>
          </div>
          <p className="font-inter text-sm text-silver mt-1">
            Connect live automotive services, classified portals, communications gateways, and accounting ledgers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/advertising">
            <Button variant="outline" className="gap-2 font-mono text-xs border-steel text-silver hover:text-cream">
              <Layers className="w-4 h-4 text-blue" />
              ADVERTISING COMMAND CENTRE
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Connected Live</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">{connectedCount}</span>
            <span className="text-[11px] font-mono text-emerald-400/80">Active Gateways</span>
          </div>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Ready To Connect</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-blue">{availableCount}</span>
            <span className="text-[11px] font-mono text-blue/80">Env Credentials</span>
          </div>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Credentials Required</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">{credsRequiredCount}</span>
            <span className="text-[11px] font-mono text-amber-400/80">Action Needed</span>
          </div>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Commercial Access Req.</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-purple-400">{commercialRequiredCount}</span>
            <span className="text-[11px] font-mono text-purple-400/80">Contracts</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-carbon/50 border border-steel p-3 rounded-[2px]">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-[2px] font-mono text-xs tracking-wider whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue text-cream font-semibold'
                  : 'bg-carbon text-silver hover:text-cream hover:bg-steel/40 border border-steel/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-pewter absolute left-3 top-2.5" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-void border-steel text-xs font-mono"
          />
        </div>
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-carbon border border-steel hover:border-blue/50 transition-colors p-5 rounded-[2px] flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="font-mono text-[10px] text-pewter uppercase tracking-wider block">
                    {item.categoryLabel}
                  </span>
                  <h3 className="font-syne font-bold text-base text-cream mt-0.5">{item.name}</h3>
                </div>
                {renderStatusBadge(item.state.status)}
              </div>

              <p className="font-inter text-xs text-silver leading-relaxed line-clamp-3 mb-4">
                {item.description}
              </p>

              {item.commercialRequirement && (
                <div className="bg-void border border-purple-500/20 p-2.5 rounded-[2px] mb-3">
                  <p className="font-mono text-[11px] text-purple-300 flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>{item.commercialRequirement}</span>
                  </p>
                </div>
              )}

              {item.state.lastSyncAt && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-pewter">
                  <Clock className="w-3.5 h-3.5 text-pewter" />
                  <span>Last sync: {new Date(item.state.lastSyncAt).toLocaleString('en-GB')}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-steel/60 flex items-center justify-between gap-2">
              <Link href={`/settings/integrations/${item.id}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between font-mono text-xs border-steel text-silver hover:text-cream hover:border-slate"
                >
                  <span>CONFIGURE</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>

              {(item.state.status === 'connected' || item.state.status === 'available') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleTestConnection(item.id, e)}
                  disabled={testingId === item.id}
                  className="font-mono text-xs border-steel text-silver hover:text-cream px-3"
                  title="Test Live Connection"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingId === item.id ? 'animate-spin text-blue' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
