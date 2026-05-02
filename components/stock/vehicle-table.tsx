'use client'

import { formatCurrency, formatRegistration } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { differenceInDays } from 'date-fns'

interface VehicleTableProps {
  vehicles: any[]
}

export default function VehicleTable({ vehicles }: VehicleTableProps) {
  const router = useRouter()
  const now = new Date()

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-carbon border-b border-steel">
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider w-16">Photo</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">REG</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Vehicle</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Mileage</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Asking</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Cost</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Margin</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-center">Days</th>
            <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Status</th>
            <th className="py-3 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => {
            const totalCost = (vehicle.purchase_price || 0) + (vehicle.prep_cost || 0) + (vehicle.transport_cost || 0)
            const margin = (vehicle.asking_price || 0) - totalCost
            const days = differenceInDays(now, new Date(vehicle.created_at))

            return (
              <tr 
                key={vehicle.id} 
                className="border-b border-steel hover:bg-carbon cursor-pointer transition-colors"
                onClick={() => router.push(`/stock/${vehicle.id}`)}
              >
                <td className="py-3 px-4">
                  <div className="w-12 h-12 bg-asphalt rounded-[2px] flex items-center justify-center border border-steel overflow-hidden">
                    {vehicle.photos && vehicle.photos.length > 0 ? (
                      <img src={vehicle.photos[vehicle.primary_photo_index || 0]} alt={vehicle.registration} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={16} className="text-pewter" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[13px] text-cream bg-asphalt border border-steel px-2 py-1 rounded-[2px]">
                    {formatRegistration(vehicle.registration)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <p className="font-inter font-medium text-[14px] text-cream truncate max-w-[200px]">
                    <span className="text-silver mr-1">{vehicle.year}</span>
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="font-inter text-[12px] text-silver truncate max-w-[200px]">{vehicle.variant}</p>
                </td>
                <td className="py-3 px-4 text-right font-mono text-[12px] text-silver">
                  {vehicle.mileage.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[13px] text-cream">
                  {formatCurrency(vehicle.asking_price)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[12px] text-silver">
                  {formatCurrency(totalCost)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[13px]">
                  <span className={
                    margin > 3000 ? "text-positive" : 
                    margin > 1000 ? "text-silver" : "text-negative"
                  }>
                    {formatCurrency(margin)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-mono text-[12px]">
                  <span className={
                    days < 25 ? "text-positive" : 
                    days < 45 ? "text-warning" : "text-negative"
                  }>
                    {days}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={
                    vehicle.status === 'available' ? 'default' :
                    vehicle.status === 'reserved' ? 'warning' :
                    vehicle.status === 'sold' ? 'positive' : 'secondary'
                  }>
                    {vehicle.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right text-pewter">
                  <ChevronRight size={16} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {vehicles.length === 0 && (
        <div className="py-12 text-center border-b border-steel">
          <p className="font-inter text-sm text-pewter">No vehicles found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
