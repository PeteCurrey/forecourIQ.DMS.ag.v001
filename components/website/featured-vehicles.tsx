import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import VehicleCard from './vehicle-card'
import type { PublicVehicle } from '@/lib/types/public-website'

export default function FeaturedVehicles({
  vehicles,
  primaryColour = '#0EA5E9',
  title = 'Featured Inventory',
  subtitle = 'Handpicked vehicles in showroom condition ready for immediate delivery',
}: {
  vehicles: PublicVehicle[]
  primaryColour?: string
  title?: string
  subtitle?: string
}) {
  if (!vehicles.length) return null

  return (
    <section className="py-16 bg-gray-50/70 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Handpicked Selection</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
              {subtitle}
            </p>
          </div>

          <Link
            href="/used-cars"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-900 hover:text-sky-600 transition-colors shrink-0"
          >
            <span>View All Stock ({vehicles.length}+)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} primaryColour={primaryColour} />
          ))}
        </div>
      </div>
    </section>
  )
}
