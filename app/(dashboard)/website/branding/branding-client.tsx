'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Paintbrush,
  ChevronLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import type { DealerWebsiteRecord } from '@/lib/services/website/website-service'

export default function BrandingClient({
  initialWebsite,
}: {
  initialWebsite: DealerWebsiteRecord
}) {
  const [website, setWebsite] = useState(initialWebsite)
  const [primaryColour, setPrimaryColour] = useState(website.primary_colour || '#0EA5E9')
  const [accentColour, setAccentColour] = useState(website.accent_colour || '#F97316')
  const [themePreset, setThemePreset] = useState(website.theme_preset || 'contemporary')
  const [fontHeading, setFontHeading] = useState(website.font_heading || 'Inter')
  const [fontBody, setFontBody] = useState(website.font_body || 'Inter')
  const [logoUrl, setLogoUrl] = useState(website.logo_url || '')
  const [heroImageUrl, setHeroImageUrl] = useState(website.hero_image_url || '')

  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatusMsg(null)

    try {
      const res = await fetch('/api/website', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_colour: primaryColour,
          accent_colour: accentColour,
          theme_preset: themePreset,
          font_heading: fontHeading,
          font_body: fontBody,
          logo_url: logoUrl || null,
          hero_image_url: heroImageUrl || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      setWebsite(data.website)
      setStatusMsg({ type: 'success', text: 'Branding settings saved successfully.' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update branding.' })
    } finally {
      setSaving(false)
    }
  }

  const themes = [
    {
      id: 'contemporary',
      name: 'Contemporary',
      description: 'Clean modern lines with high-contrast typography and dynamic card layouts.',
    },
    {
      id: 'prestige',
      name: 'Prestige',
      description: 'Sophisticated luxury aesthetic tailored for high-value and specialist marques.',
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Bold dark-mode accents and sharp geometric styling suited for sports vehicles.',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Stripped-back editorial whitespace focusing purely on vehicle photography.',
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional automotive layout prioritizing heritage and trust indicators.',
    },
  ]

  const fonts = ['Inter', 'Plus Jakarta Sans', 'Outfit', 'Montserrat', 'Playfair Display']

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/website"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Website Command Centre</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Theme & Visual Identity
          </h1>
          <p className="text-xs text-muted-foreground">
            Customise your digital showroom aesthetics, colour palette, typography and imagery.
          </p>
        </div>
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
        {/* Theme Presets */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-border">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>1. Design System Preset</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemePreset(t.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  themePreset === t.id
                    ? 'border-sky-500 bg-sky-950/30 ring-1 ring-sky-500'
                    : 'border-border bg-secondary/30 hover:bg-secondary/60'
                }`}
              >
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>{t.name}</span>
                  {themePreset === t.id && (
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Colours */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-border">
            <Paintbrush className="w-4 h-4 text-sky-400" />
            <span>2. Dealership Brand Palette</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white">
                Primary Brand Colour
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColour}
                  onChange={(e) => setPrimaryColour(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColour}
                  onChange={(e) => setPrimaryColour(e.target.value)}
                  className="flex-1 text-xs font-mono rounded-lg border border-border bg-secondary/50 py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Used for primary CTAs, active states, key badges and vehicle highlights.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white">
                Accent / Secondary Colour
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColour}
                  onChange={(e) => setAccentColour(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={accentColour}
                  onChange={(e) => setAccentColour(e.target.value)}
                  className="flex-1 text-xs font-mono rounded-lg border border-border bg-secondary/50 py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Used for secondary buttons, trust highlights and notification pills.
              </p>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-border">
            3. Typography Pairing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Heading Typography
              </label>
              <select
                value={fontHeading}
                onChange={(e) => setFontHeading(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {fonts.map((f) => (
                  <option key={f} value={f} className="bg-zinc-900 text-white">
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Body Typography
              </label>
              <select
                value={fontBody}
                onChange={(e) => setFontBody(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {fonts.map((f) => (
                  <option key={f} value={f} className="bg-zinc-900 text-white">
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Media / URLs */}
        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-border">
            4. Dealership Logo & Hero Assets
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Dealership Logo URL (PNG/SVG)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full text-xs rounded-lg border border-border py-2 px-3 bg-secondary/50 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Hero Showroom Background Image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
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
            <span>Save Branding Changes</span>
          </button>
        </div>
      </form>
    </div>
  )
}
