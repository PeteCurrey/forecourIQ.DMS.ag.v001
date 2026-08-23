'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Layers,
  ChevronLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import type { DealerWebsiteRecord } from '@/lib/services/website/website-service'
import type { HomepageSection } from '@/lib/types/public-website'

export default function EditorClient({
  initialWebsite,
}: {
  initialWebsite: DealerWebsiteRecord
}) {
  const [website, setWebsite] = useState(initialWebsite)
  const [heroTitle, setHeroTitle] = useState(website.hero_title || '')
  const [heroSubtitle, setHeroSubtitle] = useState(website.hero_subtitle || '')
  const [heroCtaText, setHeroCtaText] = useState(website.hero_cta_text || 'View Our Stock')
  const [heroCtaUrl, setHeroCtaUrl] = useState(website.hero_cta_url || '/used-cars')
  const [propositionHeadline, setPropositionHeadline] = useState(website.proposition_headline || '')
  const [propositionBody, setPropositionBody] = useState(website.proposition_body || '')

  const defaultSections: HomepageSection[] = [
    { type: 'hero', enabled: true, order: 1 },
    { type: 'search', enabled: true, order: 2 },
    { type: 'featured_vehicles', enabled: true, order: 3 },
    { type: 'proposition', enabled: true, order: 4 },
    { type: 'finance_cta', enabled: true, order: 5 },
    { type: 'px_cta', enabled: true, order: 6 },
    { type: 'location', enabled: true, order: 7 },
  ]

  const [sections, setSections] = useState<HomepageSection[]>(
    website.homepage_sections && website.homepage_sections.length > 0
      ? website.homepage_sections
      : defaultSections
  )

  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const sectionLabels: Record<string, string> = {
    hero: 'Hero Banner & Main Call-to-Action',
    search: 'Quick Inventory Search & Filter Bar',
    featured_vehicles: 'Featured Showroom Inventory Grid',
    proposition: 'Dealership Value Proposition & Trust Points',
    finance_cta: 'Car Finance Promotional Banner',
    px_cta: 'Part Exchange Free Valuation Banner',
    location: 'Showroom Location & Opening Hours Card',
  }

  const toggleSection = (idx: number) => {
    const updated = [...sections]
    updated[idx].enabled = !updated[idx].enabled
    setSections(updated)
  }

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sections.length) return

    const updated = [...sections]
    const temp = updated[idx]
    updated[idx] = updated[newIdx]
    updated[newIdx] = temp

    // Reassign order
    updated.forEach((s, i) => (s.order = i + 1))
    setSections(updated)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatusMsg(null)

    try {
      const res = await fetch('/api/website', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_title: heroTitle || null,
          hero_subtitle: heroSubtitle || null,
          hero_cta_text: heroCtaText,
          hero_cta_url: heroCtaUrl,
          proposition_headline: propositionHeadline || null,
          proposition_body: propositionBody || null,
          homepage_sections: sections,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      setWebsite(data.website)
      setStatusMsg({ type: 'success', text: 'Homepage structure saved successfully.' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save sections.' })
    } finally {
      setSaving(false)
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
          Homepage Section Editor
        </h1>
        <p className="text-xs text-muted-foreground">
          Arrange and customize structural components of your public dealership homepage.
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section Ordering */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-border">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>1. Section Order & Visibility</span>
          </h3>

          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={section.type}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  section.enabled
                    ? 'bg-secondary/40 border-border text-white'
                    : 'bg-secondary/10 border-border/40 text-muted-foreground opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-4">
                    {idx + 1}.
                  </span>
                  <span className="text-xs font-semibold">
                    {sectionLabels[section.type] || section.type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-white disabled:opacity-30"
                    aria-label="Move section up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSection(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-white disabled:opacity-30"
                    aria-label="Move section down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSection(idx)}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ml-2 ${
                      section.enabled
                        ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {section.enabled ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Section Content */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-border">
            2. Hero Banner Copy
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Main Hero Headline
              </label>
              <input
                type="text"
                placeholder="e.g. Quality Used Cars in Manchester"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Supporting Subtitle
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Handpicked vehicles thoroughly inspected and prepared to the highest standards."
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Primary Button Text
                </label>
                <input
                  type="text"
                  value={heroCtaText}
                  onChange={(e) => setHeroCtaText(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Button Destination URL
                </label>
                <input
                  type="text"
                  value={heroCtaUrl}
                  onChange={(e) => setHeroCtaUrl(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Proposition Section Content */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-border">
            3. Dealership Proposition Copy
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Proposition Section Heading
              </label>
              <input
                type="text"
                placeholder="e.g. Why Choose Premier Motor Group?"
                value={propositionHeadline}
                onChange={(e) => setPropositionHeadline(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Proposition Supporting Text
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Transparent pricing, multi-point checks and complete peace of mind with every purchase."
                value={propositionBody}
                onChange={(e) => setPropositionBody(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Homepage Sections</span>
          </button>
        </div>
      </form>
    </div>
  )
}
