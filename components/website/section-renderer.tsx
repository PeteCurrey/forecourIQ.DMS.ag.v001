import Link from 'next/link'
import { ShieldCheck, Award, ThumbsUp, Wrench, ArrowRight, Car, MapPin, Phone, Calculator, Clock } from 'lucide-react'
import HeroSection from './hero-section'
import FeaturedVehicles from './featured-vehicles'
import VehicleSearch from './vehicle-search'
import type { PublicDealer, PublicVehicle, HomepageSection } from '@/lib/types/public-website'

export default function SectionRenderer({
  sections,
  dealer,
  featuredVehicles = [],
  availableMakes = [],
}: {
  sections: HomepageSection[]
  dealer: PublicDealer
  featuredVehicles?: PublicVehicle[]
  availableMakes?: string[]
}) {
  const enabledSections = [...sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)

  return (
    <div>
      {enabledSections.map((section, idx) => {
        switch (section.type) {
          case 'hero':
            return <HeroSection key={idx} dealer={dealer} />

          case 'search':
            return (
              <div key={idx} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 mb-12">
                <VehicleSearch availableMakes={availableMakes} primaryColour={dealer.primary_colour} />
              </div>
            )

          case 'featured_vehicles':
            return (
              <FeaturedVehicles
                key={idx}
                vehicles={featuredVehicles}
                primaryColour={dealer.primary_colour}
              />
            )

          case 'proposition':
            return (
              <section key={idx} className="py-16 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {dealer.proposition_headline || `Why Choose ${dealer.name}?`}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {dealer.proposition_body ||
                        'We pride ourselves on delivering an exceptional buying experience with transparent pricing and complete peace of mind.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: dealer.primary_colour }}
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">HPI & Provenance Clear</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Every vehicle is thoroughly verified against UK registers for outstanding finance, insurance write-offs and mileage discrepancies.
                      </p>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: dealer.primary_colour }}
                      >
                        <Wrench className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">Multi-Point Inspection</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Our technicians perform comprehensive mechanical and safety inspections before any vehicle is approved for sale.
                      </p>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: dealer.primary_colour }}
                      >
                        <Calculator className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">Tailored Finance</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Competitive rates and flexible HP/PCP agreements from our panel of reputable automotive finance providers.
                      </p>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: dealer.primary_colour }}
                      >
                        <ThumbsUp className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">Fair Part Exchange</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Get a genuine, competitive market valuation for your existing vehicle with zero obligation.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )

          case 'finance_cta':
            return (
              <section key={idx} className="py-14 bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-2 max-w-xl">
                    <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                      Automotive Finance Solutions
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold">
                      Affordable Monthly Payment Options
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Drive away in your ideal vehicle with manageable monthly payments. Apply online or speak with our finance specialists.
                    </p>
                  </div>
                  <Link
                    href="/finance"
                    className="px-6 py-3 text-xs font-bold text-gray-900 bg-white rounded-xl hover:bg-gray-100 transition-colors shrink-0 shadow-lg flex items-center gap-2"
                  >
                    <span>Check Finance Options</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </section>
            )

          case 'px_cta':
            return (
              <section key={idx} className="py-14 bg-sky-50 border-y border-sky-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-2 max-w-xl">
                    <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                      Part Exchange Your Car
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                      Instant Free Vehicle Valuation
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Looking to trade in your current vehicle? We offer competitive allowances against any car in our stock.
                    </p>
                  </div>
                  <Link
                    href="/part-exchange"
                    className="px-6 py-3 text-xs font-bold text-white rounded-xl shadow-lg hover:opacity-90 transition-opacity shrink-0 flex items-center gap-2"
                    style={{ backgroundColor: dealer.primary_colour }}
                  >
                    <Car className="w-4 h-4" />
                    <span>Value My Car</span>
                  </Link>
                </div>
              </section>
            )

          case 'location':
            return (
              <section key={idx} className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-gray-50 rounded-3xl p-8 sm:p-12 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                        Visit Our Showroom
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {dealer.name}
                      </h2>
                      {dealer.address_line1 && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <span>
                            {dealer.address_line1}
                            {dealer.city && `, ${dealer.city}`}
                            {dealer.county && `, ${dealer.county}`}
                            {dealer.postcode && ` ${dealer.postcode}`}
                          </span>
                        </div>
                      )}
                      {dealer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                          <a href={`tel:${dealer.phone}`} className="font-semibold text-gray-900 hover:text-sky-600">
                            {dealer.phone}
                          </a>
                        </div>
                      )}
                      <div className="pt-2">
                        <Link
                          href="/contact"
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 shadow-sm"
                          style={{ backgroundColor: dealer.primary_colour }}
                        >
                          <span>Get Directions & Opening Times</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    <div className="bg-gray-200 rounded-2xl h-64 flex items-center justify-center text-gray-500 text-xs">
                      <div className="text-center space-y-1">
                        <MapPin className="w-8 h-8 mx-auto text-gray-400" />
                        <div className="font-semibold">{dealer.name}</div>
                        <div>{dealer.city || 'Showroom Location'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
