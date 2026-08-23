'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react'

interface WebsiteRedirect {
  id: string
  from_path: string
  to_path: string
  status_code: number
  note: string | null
  created_at: string
}

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<WebsiteRedirect[]>([])
  const [fromPath, setFromPath] = useState('')
  const [toPath, setToPath] = useState('')
  const [statusCode, setStatusCode] = useState<number>(301)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadRedirects = async () => {
    try {
      const res = await fetch('/api/website/redirects')
      const data = await res.json()
      if (res.ok) setRedirects(data.redirects || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRedirects()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromPath.trim() || !toPath.trim()) return

    setSubmitting(true)
    setStatusMsg(null)

    try {
      const res = await fetch('/api/website/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_path: fromPath.trim(),
          to_path: toPath.trim(),
          status_code: statusCode,
          note: note.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add redirect')

      setFromPath('')
      setToPath('')
      setNote('')
      setStatusMsg({ type: 'success', text: '301 redirect rule added successfully.' })
      loadRedirects()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error creating redirect rule.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/website/redirects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Redirect deleted.' })
        loadRedirects()
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete redirect' })
    }
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
          301 URL Redirects & SEO Migration
        </h1>
        <p className="text-xs text-muted-foreground">
          Map legacy website URLs to new ForecourIQ pages to preserve Google ranking authority and inbound links.
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

      {/* Add Form */}
      <form onSubmit={handleAdd} className="bg-card p-6 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-border">
          <RefreshCw className="w-4 h-4 text-sky-400" />
          <span>Add URL Redirect Rule</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">
              Source Path (Old URL)
            </label>
            <input
              type="text"
              required
              placeholder="/cars-for-sale/old-link.html"
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">
              Destination Path (New URL)
            </label>
            <input
              type="text"
              required
              placeholder="/used-cars"
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">
              Status Code
            </label>
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value={301} className="bg-zinc-900 text-white">301 — Permanent Redirect (SEO Recommended)</option>
              <option value={302} className="bg-zinc-900 text-white">302 — Temporary Redirect</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-white mb-1">
              Internal Migration Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Migrated from old WordPress site"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Add Redirect Rule</span>
          </button>
        </div>
      </form>

      {/* Redirects List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 bg-secondary/30 border-b border-border text-xs font-bold text-white uppercase tracking-wider">
          Active Redirect Rules ({redirects.length})
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
            Loading redirects...
          </div>
        ) : redirects.length > 0 ? (
          <div className="divide-y divide-border">
            {redirects.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-white">
                    <span className="text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                      {r.from_path}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                      {r.to_path}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      ({r.status_code})
                    </span>
                  </div>
                  {r.note && (
                    <div className="text-[11px] text-muted-foreground">
                      Note: {r.note}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded-lg hover:bg-secondary"
                  title="Delete redirect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <p>No URL redirects configured yet.</p>
            <p className="text-[11px]">Add rules when migrating from an existing dealer website.</p>
          </div>
        )}
      </div>
    </div>
  )
}
