'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DealershipIntegrationWithMeta } from '@/lib/services/integrations/registry'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Activity,
  Layers,
  Save,
  Trash2,
  Lock,
} from 'lucide-react'

export default function IntegrationDetailClient({
  integration: initialIntegration,
  initialRuns,
  dealershipId,
  userRole,
}: {
  integration: DealershipIntegrationWithMeta
  initialRuns: any[]
  dealershipId: string
  userRole?: string
}) {
  const router = useRouter()
  const [integration, setIntegration] = useState(initialIntegration)
  const [runs, setRuns] = useState(initialRuns)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Form states
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const existing = (integration.state.settings as Record<string, string>) || {}
    const initial: Record<string, string> = {}
    integration.requiredFields.forEach((field) => {
      initial[field] = existing[field] || ''
    })
    return initial
  })

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          status: 'connected',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save settings')

      toast.success('Integration settings updated successfully.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const res = await fetch(`/api/integrations/${integration.id}/test`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message || 'Connection verified successfully.')
      } else {
        toast.error(data.message || 'Connection test failed.')
      }
      router.refresh()
    } catch {
      toast.error('Failed to trigger connection test.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return

    setIsDisconnecting(true)
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to disconnect')

      toast.success('Integration disconnected.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-void text-cream p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-silver hover:text-cream transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>BACK TO ALL INTEGRATIONS</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[2px] bg-carbon border border-steel flex items-center justify-center font-syne font-bold text-xl text-blue">
              {integration.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-syne tracking-tight text-cream">{integration.name}</h1>
                <Badge
                  variant={integration.state.status === 'connected' ? 'positive' : 'secondary'}
                  className="font-mono text-[10px]"
                >
                  {integration.state.status.toUpperCase().replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="font-inter text-xs text-silver mt-1">{integration.categoryLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="font-mono text-xs gap-2 border-steel text-silver hover:text-cream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue' : ''}`} />
              TEST CONNECTION
            </Button>

            {integration.state.status === 'connected' && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="font-mono text-xs gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                DISCONNECT
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Setup & Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description & Requirements */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
            <h2 className="font-syne font-bold text-base text-cream">Provider Information</h2>
            <p className="font-inter text-sm text-silver leading-relaxed">{integration.description}</p>

            {integration.commercialRequirement && (
              <div className="bg-void border border-purple-500/30 p-4 rounded-[2px]">
                <h3 className="font-mono text-xs text-purple-400 uppercase tracking-wider font-semibold mb-1">
                  Commercial Access Requirement
                </h3>
                <p className="font-inter text-xs text-silver leading-relaxed">{integration.commercialRequirement}</p>
              </div>
            )}

            {integration.setupGuide && (
              <div className="bg-void border border-steel p-4 rounded-[2px]">
                <h3 className="font-mono text-xs text-pewter uppercase tracking-wider font-semibold mb-1">
                  Configuration Guide
                </h3>
                <p className="font-inter text-xs text-silver leading-relaxed">{integration.setupGuide}</p>
              </div>
            )}
          </div>

          {/* Credentials / Settings Form */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-syne font-bold text-base text-cream">Connection Credentials</h2>
              <span className="font-mono text-[11px] text-pewter flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-pewter" /> Server-side encrypted
              </span>
            </div>

            {integration.requiredFields.length === 0 ? (
              <p className="font-mono text-xs text-pewter">No custom credentials required for this service.</p>
            ) : (
              <div className="space-y-4">
                {integration.requiredFields.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">
                      {field.replace(/_/g, ' ')}
                    </label>
                    <Input
                      type={field.includes('key') || field.includes('secret') || field.includes('token') ? 'password' : 'text'}
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                      value={settings[field] || ''}
                      onChange={(e) => setSettings({ ...settings, [field]: e.target.value })}
                      className="bg-void border-steel text-xs font-mono text-cream"
                    />
                  </div>
                ))}

                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="font-mono text-xs gap-2 mt-4 bg-blue hover:bg-blue/90 text-cream"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'SAVING...' : 'SAVE & ACTIVATE'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Health & Status Telemetry */}
        <div className="space-y-6">
          {/* Health Box */}
          <div className="bg-carbon border border-steel p-5 rounded-[2px] space-y-4">
            <h2 className="font-syne font-bold text-sm text-cream uppercase tracking-wider">Connection Health</h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-steel/60">
                <span className="font-mono text-xs text-pewter">Status</span>
                <span className="font-mono text-xs font-semibold text-cream">
                  {integration.state.status.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-steel/60">
                <span className="font-mono text-xs text-pewter">Health</span>
                <span className="font-mono text-xs font-semibold text-cream capitalize">
                  {integration.state.health}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-steel/60">
                <span className="font-mono text-xs text-pewter">Auth Protocol</span>
                <span className="font-mono text-xs text-cream uppercase">{integration.authType}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-steel/60">
                <span className="font-mono text-xs text-pewter">Last Synchronised</span>
                <span className="font-mono text-xs text-cream">
                  {integration.state.lastSyncAt
                    ? new Date(integration.state.lastSyncAt).toLocaleString('en-GB')
                    : 'Never'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-mono text-xs text-pewter">Webhooks</span>
                <span className="font-mono text-xs text-cream">
                  {integration.supportsWebhooks ? 'Supported' : 'Not Applicable'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Runs / Audit Table */}
      <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-syne font-bold text-base text-cream">Recent Integration Runs</h2>
            <p className="font-inter text-xs text-silver mt-0.5">
              Live audit record of API executions, feed jobs, and webhook receipts.
            </p>
          </div>
          <span className="font-mono text-[11px] text-pewter">{runs.length} Recorded Runs</span>
        </div>

        {runs.length === 0 ? (
          <div className="py-8 text-center text-pewter font-mono text-xs border border-dashed border-steel rounded-[2px]">
            No integration activity recorded yet for {integration.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-asphalt border-b border-steel">
                  <th className="py-2.5 px-4 font-mono text-[10px] text-pewter uppercase">Timestamp</th>
                  <th className="py-2.5 px-4 font-mono text-[10px] text-pewter uppercase">Operation</th>
                  <th className="py-2.5 px-4 font-mono text-[10px] text-pewter uppercase">Status</th>
                  <th className="py-2.5 px-4 font-mono text-[10px] text-pewter uppercase">Latency</th>
                  <th className="py-2.5 px-4 font-mono text-[10px] text-pewter uppercase">Details / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel/60">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-steel/20 transition-colors font-mono text-xs">
                    <td className="py-2.5 px-4 text-pewter">{new Date(run.created_at).toLocaleString('en-GB')}</td>
                    <td className="py-2.5 px-4 text-cream uppercase">{run.operation}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded-[2px] text-[10px] uppercase font-semibold ${
                          run.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-pewter">{run.duration_ms ? `${run.duration_ms}ms` : '—'}</td>
                    <td className="py-2.5 px-4 text-silver max-w-xs truncate">
                      {run.error_message || run.external_reference || 'Completed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
