import Link from 'next/link'
import { Calculator, ShieldCheck, ArrowRight } from 'lucide-react'
import type { PublicVehicle } from '@/lib/types/public-website'

export default function FinanceCTA({
  vehicle,
  primaryColour = '#0EA5E9',
}: {
  vehicle: PublicVehicle
  primaryColour?: string
}) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-6 shadow-md space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
        <Calculator className="w-4 h-4" />
        <span>Flexible Car Finance</span>
      </div>

      <div className="space-y-1">
        <h4 className="text-lg font-bold">
          Looking to spread the cost?
        </h4>
        <p className="text-xs text-gray-300 leading-relaxed">
          We work with a wide panel of specialist automotive lenders to find competitive Hire Purchase (HP) and Personal Contract Purchase (PCP) terms tailored to your budget.
        </p>
      </div>

      <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-gray-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Finance available on request — soft credit check options</span>
        </div>
        <p className="text-[11px] text-gray-400">
          Representative APR, term and deposit customized to your personal circumstances upon application.
        </p>
      </div>

      <div className="pt-1">
        <Link
          href={`/finance?vehicle=${vehicle.slug}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-900 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
        >
          <span>Explore Finance Options</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
