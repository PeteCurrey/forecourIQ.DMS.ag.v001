'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PortalListingRecord, checkAdvertisingReadiness } from '@/lib/services/integrations/advertising-calc'
import { DealershipIntegrationWithMeta } from '@/lib/services/integrations/registry'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Search,
  UploadCloud,
  EyeOff,
  Clock,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react'

export default function AdvertisingClient({
  initialListings,
  initialErrors,
  vehicles,
  advertisingIntegrations,
  dealershipId,
  userRole,
}: {
  initialListings: PortalListingRecord[]
  initialErrors: any[]
  vehicles: any[]
  advertisingIntegrations: DealershipIntegrationWithMeta[]
  dealershipId: string
  userRole?: string
}) {
  const router = useRouter()
  const [listings, setListings] = useState<PortalListingRecord[]>(initialListings)
  const [activeTab, setActiveTab] = useState<'listings' | 'ready' | 'errors' | 'config'>('listings')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPortal, setSelectedPortal] = useState<string>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Metrics
  const liveCount = listings.filter((l) => l.status === 'live').length
  const pendingUpdateCount = listings.filter((l) => l.status === 'update_pending').length
  const errorCount = initialErrors.length
  const readyVehicles = vehicles.filter((v) => checkAdvertisingReadiness(v).isReady)

  // Handlers
  const handlePublish = async (vehicleId: string, providerId: string) => {
    setProcessingId(`${vehicleId}_${providerId}`)
    try {
      const res = await fetch('/api/advertising/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, provider_id: providerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')

      toast.success(data.message || 'Vehicle published successfully.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleWithdraw = async (vehicleId: string, providerId: string) => {
    setProcessingId(`${vehicleId}_${providerId}`)
    try {
      const res = await fetch('/api/advertising/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, provider_id: providerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Withdraw failed')

      toast.success('Listing withdrawn from portal.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const renderPortalStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )
      case 'update_pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-blue-500/10 border border-blue-500/30 text-blue font-mono text-[10px] uppercase font-semibold">
            <RefreshCw className="w-3 h-3 text-blue animate-spin" />
            Price Update Pending
          </span>
        )
      case 'connection_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase font-semibold">
            Credentials Required
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase font-semibold">
            Sync Error
          </span>
        )
      case 'removed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-steel/20 border border-steel text-pewter font-mono text-[10px] uppercase">
            Withdrawn
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-steel/20 border border-steel text-pewter font-mono text-[10px] uppercase">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-void text-cream p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-syne tracking-tight text-cream">Advertising Feeds & Portals</h1>
            <Badge variant="outline" className="font-mono text-[11px] text-pewter border-steel">
              Feed Engine Active
            </Badge>
          </div>
          <p className="font-inter text-sm text-silver mt-1">
            Manage multi-portal classified feeds across AutoTrader, Motors, CarGurus, and eBay Motors with real-time sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/settings/integrations">
            <Button variant="outline" className="font-mono text-xs border-steel text-silver hover:text-cream">
              PORTAL CREDENTIALS
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Live Adverts</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">{liveCount}</span>
            <span className="text-[11px] font-mono text-emerald-400/80">Active Listings</span>
          </div>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Update Pending</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-blue">{pendingUpdateCount}</span>
            <span className="text-[11px] font-mono text-blue/80">Price Changed</span>
          </div>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Ready To Publish</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-cream">{readyVehicles.length}</span>
            <span className="text-[11px] font-mono text-pewter">Validated Stock</span>
          </div>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px]">
          <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Feed Errors</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-bold font-mono ${errorCount > 0 ? 'text-red-400' : 'text-pewter'}`}>
              {errorCount}
            </span>
            <span className="text-[11px] font-mono text-red-400/80">Work Queue</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-steel gap-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`py-2 px-4 font-mono text-xs tracking-wider border-b-2 transition-colors ${
            activeTab === 'listings'
              ? 'border-blue text-cream font-semibold'
              : 'border-transparent text-silver hover:text-cream'
          }`}
        >
          LIVE PORTAL LISTINGS ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          className={`py-2 px-4 font-mono text-xs tracking-wider border-b-2 transition-colors ${
            activeTab === 'ready'
              ? 'border-blue text-cream font-semibold'
              : 'border-transparent text-silver hover:text-cream'
          }`}
        >
          STOCK READY TO SYNDICATE ({readyVehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`py-2 px-4 font-mono text-xs tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'errors'
              ? 'border-blue text-cream font-semibold'
              : 'border-transparent text-silver hover:text-cream'
          }`}
        >
          FEED ERROR WORK QUEUE
          {errorCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-[10px] text-cream flex items-center justify-center font-bold">
              {errorCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: LIVE LISTINGS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            {listings.length === 0 ? (
              <div className="py-12 text-center text-pewter font-mono text-xs">
                No active portal listings. Switch to "Stock Ready To Syndicate" to publish your first vehicle.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Portal</th>
                    <th className="py-3 px-4">Advertised Price</th>
                    <th className="py-3 px-4">Feed Status</th>
                    <th className="py-3 px-4">Last Verified</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel/60 font-mono text-xs">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-steel/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-cream">
                          {item.vehicles?.registration || '—'}
                        </div>
                        <div className="text-[11px] text-silver">
                          {item.vehicles?.make} {item.vehicles?.model}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-cream font-semibold uppercase">{item.provider_id}</td>
                      <td className="py-3 px-4 text-cream font-bold">
                        £{Number(item.price_at_publish || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{renderPortalStatusBadge(item.status)}</td>
                      <td className="py-3 px-4 text-pewter">
                        {item.last_verified_at ? new Date(item.last_verified_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {item.status === 'live' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWithdraw(item.vehicle_id, item.provider_id)}
                            disabled={processingId === `${item.vehicle_id}_${item.provider_id}`}
                            className="font-mono text-[11px] text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            WITHDRAW
                          </Button>
                        )}
                        {item.provider_url && (
                          <a href={item.provider_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="font-mono text-[11px] border-steel text-silver">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: READY TO SYNDICATE */}
      {activeTab === 'ready' && (
        <div className="space-y-4">
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            {readyVehicles.length === 0 ? (
              <div className="py-12 text-center text-pewter font-mono text-xs">
                No vehicles currently meet complete advertising readiness standards (require registration, photos, asking price).
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                    <th className="py-3 px-4">Registration & Vehicle</th>
                    <th className="py-3 px-4">Asking Price</th>
                    <th className="py-3 px-4">Photos</th>
                    <th className="py-3 px-4">Publish To AutoTrader</th>
                    <th className="py-3 px-4">Publish To Motors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel/60 font-mono text-xs">
                  {readyVehicles.map((veh) => (
                    <tr key={veh.id} className="hover:bg-steel/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-cream">{veh.registration}</div>
                        <div className="text-[11px] text-silver">
                          {veh.make} {veh.model} {veh.variant || ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-cream font-bold">
                        £{Number(veh.asking_price || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-pewter">{veh.photos?.length || 0} Images</td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          onClick={() => handlePublish(veh.id, 'autotrader')}
                          disabled={processingId === `${veh.id}_autotrader`}
                          className="font-mono text-[11px] bg-blue hover:bg-blue/90 text-cream gap-1.5"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          PUBLISH AUTOTRADER
                        </Button>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublish(veh.id, 'motors')}
                          disabled={processingId === `${veh.id}_motors`}
                          className="font-mono text-[11px] border-steel text-silver hover:text-cream gap-1.5"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          PUBLISH MOTORS
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ERROR WORK QUEUE */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            {initialErrors.length === 0 ? (
              <div className="py-12 text-center text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> All syndication feeds are operating cleanly with zero errors.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Target Portal</th>
                    <th className="py-3 px-4">Error Diagnostics</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel/60 font-mono text-xs">
                  {initialErrors.map((err) => (
                    <tr key={err.id} className="hover:bg-steel/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-cream">{err.vehicles?.registration || 'Stock Vehicle'}</div>
                        <div className="text-[11px] text-silver">
                          {err.vehicles?.make} {err.vehicles?.model}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold uppercase text-cream">{err.provider_id}</td>
                      <td className="py-3 px-4 text-red-400">{err.error_message || 'Feed sync failed'}</td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/settings/integrations/${err.provider_id}`}>
                          <Button variant="outline" size="sm" className="font-mono text-[11px] border-steel text-silver">
                            FIX CREDENTIALS
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
