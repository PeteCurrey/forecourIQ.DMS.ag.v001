'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Globe,
  ChevronLeft,
  Plus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import type { WebsiteDomain } from '@/lib/services/website/domain-service'

export default function DomainsPage() {
  const [domains, setDomains] = useState<WebsiteDomain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadDomains = async () => {
    try {
      const res = await fetch('/api/website/domains')
      const data = await res.json()
      if (res.ok) setDomains(data.domains || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDomains()
  }, [])

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return

    setSubmitting(true)
    setStatusMsg(null)

    try {
      const res = await fetch('/api/website/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add domain')

      setNewDomain('')
      setStatusMsg({ type: 'success', text: `Domain ${data.domain.domain} added successfully. Configure DNS below.` })
      loadDomains()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Unable to register domain.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${domainName}?`)) return

    try {
      const res = await fetch(`/api/website/domains/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Domain ${domainName} removed.` })
        loadDomains()
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to delete domain' })
    }
  }

  const copyDns = (val: string) => {
    navigator.clipboard.writeText(val)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          Custom Domains & SSL Certificates
        </h1>
        <p className="text-xs text-muted-foreground">
          Connect your custom domain (e.g. smithmotors.co.uk) to your ForecourIQ digital showroom.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Add Domain Form */}
      <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-border">
          <Globe className="w-4 h-4 text-sky-400" />
          <span>Add Custom Domain</span>
        </h3>

        <form onSubmit={handleAddDomain} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. smithmotors.co.uk"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 text-xs rounded-xl border border-border bg-secondary/50 py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
          />
          <button
            type="submit"
            disabled={submitting || !newDomain.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Connect Domain</span>
          </button>
        </form>
      </div>

      {/* Domain List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 bg-secondary/30 border-b border-border text-xs font-bold text-white uppercase tracking-wider">
          Connected Domains ({domains.length})
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
            Loading domains...
          </div>
        ) : domains.length > 0 ? (
          <div className="divide-y divide-border">
            {domains.map((dom) => (
              <div key={dom.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-sm font-bold text-white">
                      {dom.domain}
                    </span>
                    {dom.is_primary && (
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-800">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                        dom.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {dom.status.replace(/_/g, ' ')}
                    </span>

                    <button
                      onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                      className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded-lg hover:bg-secondary"
                      title="Disconnect domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* DNS Instructions Block */}
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/80 text-xs space-y-2">
                  <div className="font-semibold text-white text-xs flex items-center justify-between">
                    <span>Required DNS Records</span>
                    <button
                      type="button"
                      onClick={() => copyDns('cname.vercel-dns.com')}
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy CNAME'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-secondary/80 p-2.5 rounded-lg text-muted-foreground">
                    <div>Type: <strong className="text-white">CNAME</strong></div>
                    <div>Host: <strong className="text-white">www</strong></div>
                    <div>Target: <strong className="text-white">cname.vercel-dns.com</strong></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Point your domain registrar DNS to the CNAME target above. SSL is automatically provisioned.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
            <p>No custom domains connected yet.</p>
            <p className="text-[11px]">
              Your website is currently accessible on the ForecourIQ platform subdomain.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
