'use client'

import { formatCurrency, formatRegistration } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { differenceInDays } from 'date-fns'

interface VehicleCardGridProps {
  vehicles: any[]
}

export default function VehicleCardGrid({ vehicles }: VehicleCardGridProps) {
  const router = useRouter()
  const now = new Date()

  if (vehicles.length === 0) {
    return (
      <div className="py-12 text-center border border-steel rounded-[2px] bg-carbon mt-4">
        <p className="font-inter text-sm text-pewter">No vehicles found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
      {vehicles.map((vehicle) => {
        const totalCost = (vehicle.purchase_price || 0) + (vehicle.prep_cost || 0) + (vehicle.transport_cost || 0)
        const margin = (vehicle.asking_price || 0) - totalCost
        const days = differenceInDays(now, new Date(vehicle.created_at))

        return (
          <div 
            key={vehicle.id}
            onClick={() => router.push(`/stock/${vehicle.id}`)}
            className="bg-carbon border border-steel rounded-[2px] overflow-hidden hover:border-slate transition-colors cursor-pointer flex flex-col group"
          >
            <div className="aspect-[16/9] bg-asphalt border-b border-steel flex items-center justify-center overflow-hidden relative">
              {vehicle.photos && vehicle.photos.length > 0 ? (
                <img 
                  src={vehicle.photos[vehicle.primary_photo_index || 0]} 
                  alt={vehicle.registration} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              ) : (
                <ImageIcon size={32} className="text-steel" />
              )}
              <div className="absolute top-2 right-2">
                <Badge variant={
                  vehicle.status === 'available' ? 'default' :
                  vehicle.status === 'reserved' ? 'warning' :
                  vehicle.status === 'sold' ? 'positive' : 'secondary'
                } className="shadow-sm">
                  {vehicle.status}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
              <div className="flex items-center gap-2 mb-2 text-[11px]">
                <span className="font-mono text-cream bg-asphalt border border-steel px-1.5 py-0.5 rounded-[2px]">
                  {formatRegistration(vehicle.registration)}
                </span>
                <span className="font-mono text-pewter">•</span>
                <span className="font-mono text-pewter">{vehicle.year}</span>
                <span className="font-mono text-pewter">•</span>
                <span className="font-mono text-pewter">{vehicle.mileage.toLocaleString()} mi</span>
              </div>
              
              <h3 className="font-syne font-bold text-[15px] text-cream leading-tight mb-1">
                {vehicle.make} {vehicle.model}
              </h3>
              <p className="font-inter text-[12px] text-silver truncate mb-4">
                {vehicle.variant}
              </p>
              
              <div className="mt-auto">
                <p className="font-mono text-[16px] text-cream mb-3">
                  {formatCurrency(vehicle.asking_price)}
                </p>
                
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] px-2 py-1 rounded-[2px] border ${
                    margin > 3000 ? "bg-positive/10 border-positive/20 text-positive" : 
                    margin > 1000 ? "bg-asphalt border-steel text-silver" : 
                    "bg-negative/10 border-negative/20 text-negative"
                  }`}>
                    {margin > 0 ? '+' : ''}{formatCurrency(margin)}
                  </span>
                  
                  <span className={`font-mono text-[10px] px-2 py-1 rounded-[2px] border ${
                    days < 25 ? "bg-positive/10 border-positive/20 text-positive" : 
                    days < 45 ? "bg-warning/10 border-warning/20 text-warning" : 
                    "bg-negative/10 border-negative/20 text-negative"
                  }`}>
                    {days}d
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
