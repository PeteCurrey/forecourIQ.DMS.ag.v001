import Link from 'next/link'
import { Fuel, Gauge, Cog, Calendar, CheckCircle, Shield } from 'lucide-react'
import type { PublicVehicle } from '@/lib/types/public-website'

export default function VehicleCard({
  vehicle,
  primaryColour = '#0EA5E9',
}: {
  vehicle: PublicVehicle
  primaryColour?: string
}) {
  const isReserved = vehicle.status === 'reserved'
  const isSold = vehicle.status === 'sold'

  const formattedPrice = vehicle.asking_price_display
    ? vehicle.asking_price_display
    : vehicle.asking_price > 0
    ? `£${vehicle.asking_price.toLocaleString()}`
    : 'POA'

  const formattedMileage = vehicle.mileage
    ? `${vehicle.mileage.toLocaleString()} mi`
    : 'N/A'

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-gray-200/80 hover:border-gray-300 hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* Image container */}
      <Link href={`/used-cars/${vehicle.slug}`} className="relative aspect-[16/10] bg-gray-100 overflow-hidden block">
        {vehicle.primary_image_url ? (
          <img
            src={vehicle.primary_image_url}
            alt={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
            <span className="text-xs font-medium">Images coming soon</span>
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {vehicle.is_featured && !isReserved && !isSold && (
            <span
              className="text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-sm"
              style={{ backgroundColor: primaryColour }}
            >
              Featured
            </span>
          )}
          {isReserved && (
            <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-sm">
              Reserved
            </span>
          )}
          {isSold && (
            <span className="text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-full">
              Sold
            </span>
          )}
        </div>

        {/* Image count pill */}
        {vehicle.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {vehicle.images.length} photos
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Year & Make / Model */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-sky-600 transition-colors">
              <Link href={`/used-cars/${vehicle.slug}`}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </Link>
            </h3>
          </div>

          {vehicle.variant && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
              {vehicle.variant}
            </p>
          )}

          {vehicle.advert_headline && (
            <p className="text-xs text-gray-600 line-clamp-1 mt-1 font-medium italic">
              &ldquo;{vehicle.advert_headline}&rdquo;
            </p>
          )}
        </div>

        {/* Key Specs Row */}
        <div className="grid grid-cols-3 gap-1 py-2 border-y border-gray-100 text-[11px] text-gray-600">
          <div className="flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{formattedMileage}</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate capitalize">{vehicle.fuel_type || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Cog className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate capitalize">{vehicle.transmission || 'N/A'}</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-lg font-extrabold text-gray-900 tracking-tight">
              {formattedPrice}
            </div>
            {vehicle.is_reservable && (
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3" />
                Reserve online £{vehicle.reservation_deposit ?? 299}
              </div>
            )}
          </div>

          <Link
            href={`/used-cars/${vehicle.slug}`}
            className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 shadow-sm shrink-0"
            style={{ backgroundColor: primaryColour }}
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}
