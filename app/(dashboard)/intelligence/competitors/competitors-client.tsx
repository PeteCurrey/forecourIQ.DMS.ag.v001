'use client'

import { useState } from 'react'
import {
  Competitor,
  CompetitorActivityItem,
} from '@/lib/types/intelligence'
import {
  Eye,
  Plus,
  Compass,
  MapPin,
  Globe,
  Trash2,
  Info,
  ShieldCheck,
  TrendingDown,
  Clock,
  Layers,
} from 'lucide-react'

export default function CompetitorsClient({
  dealership,
  initialCompetitors,
  initialActivity,
  userId,
}: {
  dealership: { name: string; city?: string; county?: string }
  initialCompetitors: Competitor[]
  initialActivity: CompetitorActivityItem[]
  userId: string
}) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors)
  const [activity, setActivity] = useState<CompetitorActivityItem[]>(initialActivity)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    website: '',
    location: '',
    distance_miles: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompetitor.name) return

    setSaving(true)
    try {
      const res = await fetch('/api/intelligence/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompetitor.name,
          website: newCompetitor.website || null,
          location: newCompetitor.location || null,
          distance_miles: newCompetitor.distance_miles ? Number(newCompetitor.distance_miles) : null,
          notes: newCompetitor.notes || null,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setCompetitors((prev) => [...prev, created])
        setIsAddModalOpen(false)
        setNewCompetitor({ name: '', website: '', location: '', distance_miles: '', notes: '' })
      }
    } catch (err) {
      console.error('Failed to add competitor', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await fetch(`/api/intelligence/competitors/${id}`, { method: 'DELETE' })
      setCompetitors((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Failed to delete competitor', err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6 max-w-[1600px] mx-auto w-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-steel pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-syne font-bold text-[28px] text-cream">Competitor Monitoring</h1>
            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-[2px]">
              AUTHORISED MONITORING
            </span>
          </div>
          <p className="font-inter text-[14px] text-pewter">
            Directory of local and regional competing dealerships for market context.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-[2px] font-mono text-[12px] uppercase tracking-wider hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Competitor
          </button>
        </div>
      </div>

      {/* Governance Banner: No Unauthorised Scraping */}
      <div className="bg-asphalt border border-steel rounded-[2px] p-5 flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-blue shrink-0 mt-0.5" />
        <div className="space-y-1 font-inter text-[13px]">
          <p className="font-semibold text-cream">Truthful Provider & Governance Policy</p>
          <p className="text-pewter">
            ForecourIQ strictly adheres to automotive data governance. We do NOT perform unauthorized web scraping of portals or dealer sites. Live competitor stock feeds require authorized partner integrations or licensed market extensions.
          </p>
        </div>
      </div>

      {/* Monitored Competitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {competitors.map((comp) => (
          <div
            key={comp.id}
            className="bg-carbon border border-steel rounded-[2px] p-6 space-y-4 hover:border-steel/80 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-syne font-bold text-[18px] text-cream">{comp.name}</h3>
                {comp.location && (
                  <p className="font-inter text-[12px] text-pewter flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue" />
                    {comp.location} {comp.distance_miles ? `(${comp.distance_miles} miles away)` : ''}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] font-bold ${
                    comp.source_status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {comp.source_status === 'active' ? 'MONITORING ACTIVE' : 'SOURCE REQUIRED'}
                </span>
                <button
                  onClick={() => handleDeleteCompetitor(comp.id)}
                  className="p-1.5 text-pewter hover:text-rose-400 transition-colors"
                  title="Remove competitor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {comp.notes && (
              <p className="font-inter text-[13px] text-silver bg-asphalt p-3 rounded-[2px] border border-steel/40">
                {comp.notes}
              </p>
            )}

            <div className="flex items-center justify-between font-inter text-[12px] text-pewter pt-2 border-t border-steel/40">
              {comp.website ? (
                <a
                  href={comp.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" /> Visit Showroom
                </a>
              ) : (
                <span>No website provided</span>
              )}
              <span className="font-mono text-[10px]">Added to Monitoring</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="bg-carbon border border-steel rounded-[2px] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-steel pb-3">
          <h2 className="font-syne font-bold text-[16px] text-cream">Market Activity Observations</h2>
          <span className="font-mono text-[10px] text-pewter">REGIONAL OBSERVATIONS</span>
        </div>

        {activity.length === 0 ? (
          <div className="py-8 text-center text-pewter font-inter text-[13px]">
            No live competitor price movements recorded. Connect an authorized market feed or configure competitor API access.
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-asphalt border border-steel/60 rounded-[2px] flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-cream font-inter text-[13px]">{item.title}</p>
                  <p className="text-pewter text-[12px] font-inter">{item.description}</p>
                </div>
                <span className="font-mono text-[11px] text-pewter">{item.observed_at}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Competitor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-[2px] max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-steel pb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue" />
                <h3 className="font-syne font-bold text-[18px] text-cream">Add Competitor Dealership</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-pewter hover:text-cream font-mono text-[14px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCompetitor} className="space-y-4 font-inter text-[13px]">
              <div className="space-y-1">
                <label className="text-pewter font-mono text-[11px] uppercase">Dealership Name *</label>
                <input
                  type="text"
                  required
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                  placeholder="e.g. Apex Performance Cars"
                  className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-pewter font-mono text-[11px] uppercase">Website URL</label>
                <input
                  type="url"
                  value={newCompetitor.website}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-pewter font-mono text-[11px] uppercase">Town / County</label>
                  <input
                    type="text"
                    value={newCompetitor.location}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, location: e.target.value })}
                    placeholder="e.g. Chesterfield"
                    className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-pewter font-mono text-[11px] uppercase">Distance (Miles)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCompetitor.distance_miles}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, distance_miles: e.target.value })}
                    placeholder="e.g. 5.5"
                    className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-pewter font-mono text-[11px] uppercase">Stock Notes</label>
                <textarea
                  rows={2}
                  value={newCompetitor.notes}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, notes: e.target.value })}
                  placeholder="e.g. Key competitor for prestige SUVs and hot hatchbacks"
                  className="w-full bg-asphalt border border-steel rounded-[2px] px-3 py-2 text-cream focus:border-blue focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-steel">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-asphalt border border-steel text-cream text-[12px] font-mono uppercase rounded-[2px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue text-white text-[12px] font-mono uppercase rounded-[2px] hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
