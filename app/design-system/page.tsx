'use client';

import React, { useState } from 'react';
import { BreathingCard, BreathingCanvas } from '@/components/ui/breathing-card';
import ThemeToggle from '@/components/layout/theme-toggle';
import { 
  Car, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ArrowRight,
  Shield,
  Activity,
  Sliders
} from 'lucide-react';

export default function DesignSystemTokensPage() {
  const [motionDisabled, setMotionDisabled] = useState(false);

  return (
    <BreathingCanvas className="min-h-screen p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-caption uppercase font-mono font-bold bg-primary/10 text-primary border border-primary/30">
                DEV ONLY · SPEC QA
              </span>
              <span className="text-caption font-mono text-text-muted">v1.0.0-rc.1</span>
            </div>
            <h1 className="text-display font-sans text-text-primary">
              Forecour<span className="text-primary">IQ</span> Design System
            </h1>
            <p className="text-body text-text-secondary mt-1 max-w-2xl">
              Electric Blue, dark-first luxury automotive architecture. Tokens, typography scale, 
              self-hosted font stack (Lufga / General Sans / Inter), and 3D breathing motion system.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setMotionDisabled(!motionDisabled)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary text-body-sm font-medium transition-all"
            >
              <Sliders className="w-4 h-4 text-primary" />
              <span>{motionDisabled ? 'Motion: Paused' : 'Motion: Active (9s)'}</span>
            </button>
            <div className="p-2 rounded-lg border border-border bg-surface flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* 1. Palette: Electric Blue & Dark-First Neutral Scale */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-h2 text-text-primary">1. Palette & Surface Tokens</h2>
            <p className="text-body-sm text-text-secondary">
              High-contrast electric blue primary accent alongside dark-first near-black navy and light-mode neutral mirror.
            </p>
          </div>

          {/* Primary Accents */}
          <div>
            <h3 className="text-h4 text-text-primary mb-3">Primary Electric Blue</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="w-full h-16 rounded-lg bg-primary shadow-glow-primary flex items-center justify-center text-white font-mono font-bold text-body">
                  #0047FF
                </div>
                <div>
                  <div className="text-body font-semibold text-text-primary">--color-primary</div>
                  <div className="text-caption text-text-secondary font-mono">Electric Blue · Primary actions, active nav, focus rings</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="w-full h-16 rounded-lg bg-primary-dim flex items-center justify-center text-white font-mono font-bold text-body">
                  #1E3A8A
                </div>
                <div>
                  <div className="text-body font-semibold text-text-primary">--color-primary-dim</div>
                  <div className="text-caption text-text-secondary font-mono">Darker variant for hover & pressed states</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="w-full h-16 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold text-body">
                  rgba(0, 71, 255, 0.12)
                </div>
                <div>
                  <div className="text-body font-semibold text-text-primary">--color-primary-glow</div>
                  <div className="text-caption text-text-secondary font-mono">Subtle ambient corner light cone bleed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dark-First Surfaces */}
          <div>
            <h3 className="text-h4 text-text-primary mb-3">Canvas & Surfaces (Dark-First)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="w-full h-16 rounded-lg bg-canvas border border-border flex items-center justify-center text-text-secondary font-mono font-bold text-body">
                  #05070F
                </div>
                <div>
                  <div className="text-body font-semibold text-text-primary">--color-bg-canvas</div>
                  <div className="text-caption text-text-secondary font-mono">Near-black navy main application canvas</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="w-full h-16 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary font-mono font-bold text-body">
                  #0D1120
                </div>
                <div>
                  <div className="text-body font-semibold text-text-primary">--color-bg-surface</div>
                  <div className="text-caption text-text-secondary font-mono">Card, panel and container background</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <div className="w-full h-16 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-text-secondary font-mono font-bold text-body">
                  #151A2E
                </div>
                <div>
                  <div className="text-body font-semibold text-text-primary">--color-bg-surface-raised</div>
                  <div className="text-caption text-text-secondary font-mono">Elevated cards, modal overlays, dropdowns</div>
                </div>
              </div>
            </div>
          </div>

          {/* Text & Borders */}
          <div>
            <h3 className="text-h4 text-text-primary mb-3">Typography Contrast & Hairline Borders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <span className="text-body-lg font-bold text-text-primary block">Text Primary</span>
                <span className="text-caption font-mono text-text-secondary block">#FFFFFF (100% white)</span>
                <p className="text-body-sm text-text-primary">Titles, figures, headings</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <span className="text-body-lg font-bold text-text-secondary block">Text Secondary</span>
                <span className="text-caption font-mono text-text-secondary block">#9D9D9D (Neutral slate)</span>
                <p className="text-body-sm text-text-secondary">Labels, subtitles, metadata</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <span className="text-body-lg font-bold text-text-muted block">Text Muted</span>
                <span className="text-caption font-mono text-text-secondary block">#E1E1E0 @ 40%</span>
                <p className="text-body-sm text-text-muted">Placeholders, timestamps</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <span className="text-body-lg font-bold text-text-primary block">Hairline Border</span>
                <span className="text-caption font-mono text-text-secondary block">rgba(255,255,255,0.08)</span>
                <div className="h-4 w-full border border-border rounded mt-1 bg-surface-raised" />
              </div>
            </div>
          </div>

          {/* Status Colors */}
          <div>
            <h3 className="text-h4 text-text-primary mb-3">Status Semantic Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-status-success/15 border border-status-success/30 flex items-center justify-center text-status-success">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-body-sm font-bold text-status-success">#22C55E</div>
                  <div className="text-caption text-text-secondary">Success / Ready</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-status-warning/15 border border-status-warning/30 flex items-center justify-center text-status-warning">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-body-sm font-bold text-status-warning">#F59E0B</div>
                  <div className="text-caption text-text-secondary">Warning / Review</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-status-danger/15 border border-status-danger/30 flex items-center justify-center text-status-danger">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-body-sm font-bold text-status-danger">#EF4444</div>
                  <div className="text-caption text-text-secondary">Danger / Overdue</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-body-sm font-bold text-primary">#0047FF</div>
                  <div className="text-caption text-text-secondary">Info (Electric)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Typography Scale */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-h2 text-text-primary">2. Typography Scale (Tailwind Theme Extensions)</h2>
            <p className="text-body-sm text-text-secondary">
              Configured via Tailwind theme extensions with font-family cascade: 
              <code className="text-primary font-mono text-caption ml-1 font-bold">Lufga → General Sans → Inter → system-ui</code>
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border divide-y divide-border/60">
            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-display (2.5rem)</span>
              <span className="text-display text-text-primary flex-1">74 Retail Units in Stock</span>
              <span className="text-caption font-mono text-text-muted">40px / 1.1 line-height / -0.03em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-h1 (2.0rem)</span>
              <span className="text-h1 text-text-primary flex-1">Good afternoon, Peter</span>
              <span className="text-caption font-mono text-text-muted">32px / 1.2 line-height / -0.025em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-h2 (1.5rem)</span>
              <span className="text-h2 text-text-primary flex-1">Vehicles Requiring Attention</span>
              <span className="text-caption font-mono text-text-muted">24px / 1.25 line-height / -0.02em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-h3 (1.25rem)</span>
              <span className="text-h3 text-text-primary flex-1">Commercial Performance & Margins</span>
              <span className="text-caption font-mono text-text-muted">20px / 1.3 line-height / -0.015em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-h4 (1.125rem)</span>
              <span className="text-h4 text-text-primary flex-1">Deal Desk Pipeline Status</span>
              <span className="text-caption font-mono text-text-muted">18px / 1.35 line-height / -0.01em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-body-lg (1.0rem)</span>
              <span className="text-body-lg text-text-primary flex-1">High search volume for BMW M4 Competition in Derbyshire.</span>
              <span className="text-caption font-mono text-text-muted">16px / 1.5 line-height / -0.01em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-body (0.875rem)</span>
              <span className="text-body text-text-secondary flex-1">Default body copy for customer communication and appraisals.</span>
              <span className="text-caption font-mono text-text-muted">14px / 1.5 line-height / 0</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-body-sm (0.75rem)</span>
              <span className="text-body-sm text-text-secondary flex-1">Metadata, secondary timestamps and audit trails.</span>
              <span className="text-caption font-mono text-text-muted">12px / 1.5 line-height / 0</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-caption (0.6875rem)</span>
              <span className="text-caption text-text-muted uppercase tracking-wider flex-1">PDI INSPECTION SIGN-OFF COMPLETED</span>
              <span className="text-caption font-mono text-text-muted">11px / 1.4 line-height / 0.02em</span>
            </div>

            <div className="py-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
              <span className="text-caption font-mono text-primary font-bold w-36">text-mono-vrm (0.875rem)</span>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-mono-vrm font-mono bg-[#F5B400] text-black px-2 py-0.5 rounded-[3px] border border-black/30">
                  KP71 OWW
                </span>
                <span className="text-mono-vrm font-mono bg-white text-black px-2 py-0.5 rounded-[3px] border border-black/30">
                  DN21 XYZ
                </span>
                <span className="text-mono-vrm font-mono text-text-primary">
                  VIN: WBA33AY08NFP12948
                </span>
              </div>
              <span className="text-caption font-mono text-text-muted">14px / 1.25 line-height / 0.08em</span>
            </div>
          </div>
        </section>

        {/* 3. 3D "Breathing" Motion System & Glassmorphism */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-h2 text-text-primary">3. 3D "Breathing" Motion System & Elevated Glass</h2>
            <p className="text-body-sm text-text-secondary">
              Slow gentle scale (1.0 → 1.015) and translateY (±4px) pulse on a 9s ease-in-out cycle with 20s ambient electric blue gradient drift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Breathing Card 1: Elevated Glass with Top-Right Glow */}
            <BreathingCard 
              variant="glass" 
              glowPosition="top-right" 
              breathing={!motionDisabled} 
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-caption uppercase font-mono font-bold text-primary">
                  BREATHING CARD (TOP-RIGHT GLOW)
                </span>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>

              <div>
                <span className="text-caption text-text-secondary block">Retail Forecourt Value</span>
                <div className="text-display font-sans text-text-primary tabular-nums">
                  £1,248,900
                </div>
              </div>

              <p className="text-body-sm text-text-secondary leading-relaxed">
                38 vehicles on plot. Gentle breathing motion maintains a live ambient operating feel 
                without distracting from numerical accuracy.
              </p>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-caption font-mono text-text-muted">variant: "glass"</span>
                <div className="flex items-center gap-1 text-primary text-body-sm font-semibold">
                  <span>Review details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </BreathingCard>

            {/* Breathing Card 2: Surface Raised with Bottom-Left Glow */}
            <BreathingCard 
              variant="surface-raised" 
              glowPosition="bottom-left" 
              breathing={!motionDisabled} 
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-caption uppercase font-mono font-bold text-status-success">
                  SURFACE-RAISED (BOTTOM-LEFT GLOW)
                </span>
                <Shield className="w-4 h-4 text-status-success" />
              </div>

              <div>
                <span className="text-caption text-text-secondary block">Active Sales Pipeline</span>
                <div className="text-display font-sans text-text-primary tabular-nums">
                  £184,500
                </div>
              </div>

              <p className="text-body-sm text-text-secondary leading-relaxed">
                5 proposals active, 3 deposits secured, 2 vehicles ready for customer collection today.
              </p>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-caption font-mono text-text-muted">variant: "surface-raised"</span>
                <div className="flex items-center gap-1 text-primary text-body-sm font-semibold">
                  <span>Open Deal Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </BreathingCard>

            {/* Breathing Card 3: Standard Surface with Center Ambient Light */}
            <BreathingCard 
              variant="surface" 
              glowPosition="center" 
              breathing={!motionDisabled} 
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-caption uppercase font-mono font-bold text-status-warning">
                  CAPITAL AT RISK (CENTER GLOW)
                </span>
                <Activity className="w-4 h-4 text-status-warning" />
              </div>

              <div>
                <span className="text-caption text-text-secondary block">Stock &gt; 45 Days</span>
                <div className="text-display font-sans text-status-warning tabular-nums">
                  £39,995
                </div>
              </div>

              <p className="text-body-sm text-text-secondary leading-relaxed">
                Range Rover Sport (48 days) and Porsche 911 (61 days) highlighted for pricing revision.
              </p>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-caption font-mono text-text-muted">variant: "surface"</span>
                <div className="flex items-center gap-1 text-primary text-body-sm font-semibold">
                  <span>Inspect inventory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </BreathingCard>
          </div>
        </section>

        {/* 4. Orange Hex Audit Checklist */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-h2 text-text-primary">4. Hardcoded Orange References Audit</h2>
            <p className="text-body-sm text-text-secondary">
              Catalogued across repository prior to Phase 1 transition. Maintained intact per prompt instructions.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-primary font-semibold">#F97316 (Tailwind Orange 500)</span>
                  <span className="text-caption px-2 py-0.5 rounded bg-status-warning/10 text-status-warning font-mono">Website Theme Default</span>
                </div>
                <div className="text-caption text-text-secondary font-mono">
                  Used as default dealer website branding accent in:
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    <li>app/(website)/page.tsx (line 66)</li>
                    <li>app/(website)/layout.tsx (line 74)</li>
                    <li>lib/services/website/website-service.ts (line 194)</li>
                    <li>app/(dashboard)/website/branding/branding-client.tsx (line 23)</li>
                    <li>supabase/migrations/008_phase6_website.sql (line 45)</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-primary font-semibold">#F5B400 / #F5C518 (UK Plate Yellow)</span>
                  <span className="text-caption px-2 py-0.5 rounded bg-status-success/10 text-status-success font-mono">Functional UK Plate</span>
                </div>
                <div className="text-caption text-text-secondary font-mono">
                  Used for authentic rear UK vehicle registration plate styling in:
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    <li>components/dashboard/attention-vehicles.tsx (line 89)</li>
                    <li>components/stock/add-vehicle-form.tsx (line 246)</li>
                  </ul>
                  <em>Recommended to keep for legal UK plate realism.</em>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </BreathingCanvas>
  );
}
