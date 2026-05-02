'use client'

import { useState, useMemo } from 'react'
import StockFilters from '@/components/stock/stock-filters'
import VehicleTable from '@/components/stock/vehicle-table'
import VehicleCardGrid from '@/components/stock/vehicle-card-grid'

interface StockClientProps {
  initialVehicles: any[]
}

export default function StockClient({ initialVehicles }: StockClientProps) {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const filteredVehicles = useMemo(() => {
    return initialVehicles.filter(vehicle => {
      // Status filter
      if (status !== 'all' && vehicle.status !== status) return false
      
      // Search filter (reg, make, model)
      if (search) {
        const term = search.toLowerCase()
        const regMatch = vehicle.registration?.toLowerCase().includes(term)
        const makeMatch = vehicle.make?.toLowerCase().includes(term)
        const modelMatch = vehicle.model?.toLowerCase().includes(term)
        
        if (!regMatch && !makeMatch && !modelMatch) return false
      }
      
      return true
    })
  }, [initialVehicles, search, status])

  return (
    <div className="flex-1 flex flex-col bg-void overflow-hidden">
      <StockFilters 
        viewMode={viewMode}
        setViewMode={setViewMode}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
      />
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {viewMode === 'table' ? (
          <VehicleTable vehicles={filteredVehicles} />
        ) : (
          <VehicleCardGrid vehicles={filteredVehicles} />
        )}
      </div>
    </div>
  )
}
