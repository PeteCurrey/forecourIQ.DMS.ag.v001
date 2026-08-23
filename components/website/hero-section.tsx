import Link from 'next/link'
import { ArrowRight, Shield, Award, CheckCircle } from 'lucide-react'
import type { PublicDealer } from '@/lib/types/public-website'

export default function HeroSection({ dealer }: { dealer: PublicDealer }) {
  const heroImage =
    dealer.hero_image_url ||
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80'

  return (
    <section className="relative bg-gray-950 text-white min-h-[560px] flex items-center overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt={dealer.name}
          className="w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-sky-400">
            <Award className="w-3.5 h-3.5" />
            <span>Trusted Quality Used Vehicles</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            {dealer.hero_title || `Find Your Next Vehicle at ${dealer.name}`}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
            {dealer.hero_subtitle ||
              'Explore our curated collection of handpicked, fully inspected used vehicles with competitive finance and part-exchange options.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={dealer.hero_cta_url || '/used-cars'}
              className="px-6 py-3 text-sm font-bold text-white rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
              style={{ backgroundColor: dealer.primary_colour }}
            >
              <span>{dealer.hero_cta_text || 'Browse Current Stock'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/part-exchange"
              className="px-6 py-3 text-sm font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 rounded-xl transition-all"
            >
              Value Your Part Exchange
            </Link>
          </div>

          {/* Trust points */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Multi-Point Check</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>HPI Clear Stock</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Warranty Included</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
