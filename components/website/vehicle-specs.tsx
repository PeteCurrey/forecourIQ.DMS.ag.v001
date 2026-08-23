import { Gauge, Fuel, Cog, Calendar, Car, Shield, CheckCircle, Award } from 'lucide-react'
import type { PublicVehicle } from '@/lib/types/public-website'

export default function VehicleSpecs({ vehicle }: { vehicle: PublicVehicle }) {
  const specItems = [
    { label: 'Year', value: vehicle.year, icon: Calendar },
    { label: 'Mileage', value: vehicle.mileage ? `${vehicle.mileage.toLocaleString()} miles` : null, icon: Gauge },
    { label: 'Fuel Type', value: vehicle.fuel_type, icon: Fuel },
    { label: 'Transmission', value: vehicle.transmission, icon: Cog },
    { label: 'Body Style', value: vehicle.body_type, icon: Car },
    { label: 'Colour', value: vehicle.colour, icon: Car },
    { label: 'Engine Size', value: vehicle.engine_size, icon: Cog },
    { label: 'Doors', value: vehicle.doors ? `${vehicle.doors} Doors` : null, icon: Car },
    { label: 'CO2 Emissions', value: vehicle.co2_g_per_km ? `${vehicle.co2_g_per_km} g/km` : null, icon: Fuel },
    { label: 'MOT Expiry', value: vehicle.mot_expiry, icon: Shield },
    { label: 'Service History', value: vehicle.service_history, icon: Award },
  ].filter((item) => item.value)

  return (
    <div className="space-y-6">
      {/* Spec Grid */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Vehicle Overview & Specification
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {specItems.map((spec) => {
            const Icon = spec.icon
            return (
              <div key={spec.label} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  <span>{spec.label}</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 capitalize truncate">
                  {spec.value}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Highlights / Features (if present) */}
      {vehicle.highlights && vehicle.highlights.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Key Features & Equipment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vehicle.highlights.map((hl, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{hl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {vehicle.website_description && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
            Description
          </h3>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {vehicle.website_description}
          </div>
        </div>
      )}
    </div>
  )
}
