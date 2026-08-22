'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Download, 
  Search, 
  List, 
  LayoutGrid, 
  ChevronRight, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  Calendar,
  Filter,
  Car
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRegistration } from '@/lib/format'
import { VehicleRecord, StockKPISummary, calculateCommercials, checkAdvertisingReadiness } from '@/lib/services/vehicle-calc'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_TABS = [
  { id: 'all', label: 'All Stock' },
  { id: 'available', label: 'Available' },
  { id: 'advertised', label: 'Advertised' },
  { id: 'preparation', label: 'In Prep' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'purchased', label: 'Purchased' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'sold', label: 'Sold' },
  { id: 'archived', label: 'Archived' },
]

interface StockClientProps {
  initialVehicles: VehicleRecord[]
  kpis: StockKPISummary
  locations: { id: string; name: string }[]
  teamMembers: { id: string; full_name: string }[]
}

export default function StockClient({ 
  initialVehicles, 
  kpis, 
  locations = [], 
  teamMembers = [] 
}: StockClientProps) {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(initialVehicles)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'margin_desc' | 'days_desc'>('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkActioning, setIsBulkActioning] = useState(false)

  // Filtered & Sorted Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Status Filter
      if (statusTab !== 'all') {
        if (statusTab === 'preparation') {
          if (!['inspection', 'preparation', 'photography'].includes(v.status)) return false
        } else if (v.status !== statusTab) {
          return false
        }
      }

      // Location Filter
      if (selectedLocation !== 'all' && v.location_id !== selectedLocation) {
        return false
      }

      // Search Filter
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const regMatch = v.registration?.toLowerCase().includes(term)
        const makeMatch = v.make?.toLowerCase().includes(term)
        const modelMatch = v.model?.toLowerCase().includes(term)
        const variantMatch = v.variant?.toLowerCase().includes(term)
        const vinMatch = v.vin?.toLowerCase().includes(term)
        if (!regMatch && !makeMatch && !modelMatch && !variantMatch && !vinMatch) return false
      }

      return true
    }).sort((a, b) => {
      const commsA = calculateCommercials(a)
      const commsB = calculateCommercials(b)

      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'price_desc') return (b.asking_price || 0) - (a.asking_price || 0)
      if (sortBy === 'price_asc') return (a.asking_price || 0) - (b.asking_price || 0)
      if (sortBy === 'margin_desc') return commsB.projectedGrossMargin - commsA.projectedGrossMargin
      if (sortBy === 'days_desc') return commsB.daysOwned - commsA.daysOwned
      return 0
    })
  }, [vehicles, search, statusTab, selectedLocation, sortBy])

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredVehicles.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredVehicles.map(v => v.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleExportCSV = () => {
    window.location.href = '/api/stock/export'
  }

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return
    setIsBulkActioning(true)
    try {
      for (const id of selectedIds) {
        await fetch(`/api/vehicles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        })
      }
      setVehicles(prev => prev.map(v => selectedIds.includes(v.id) ? { ...v, status: 'archived' } : v))
      setSelectedIds([])
      toast.success(`${selectedIds.length} vehicles archived`)
    } catch {
      toast.error('Failed to update vehicles')
    } finally {
      setIsBulkActioning(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-void overflow-y-auto min-h-screen">
      
      {/* Top Header & Actions */}
      <div className="bg-carbon border-b border-steel px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-syne font-bold text-[28px] text-cream tracking-tight">Stockbook</h1>
              <span className="font-mono text-[12px] px-2.5 py-0.5 bg-asphalt border border-steel rounded-[2px] text-blue font-bold">
                {kpis.totalRetailUnits} UNITS
              </span>
            </div>
            <p className="font-inter text-sm text-silver mt-1">
              Central vehicle operations, acquisition costs, preparation, and retail margins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download size={14} /> EXPORT CSV
            </Button>
            <Button asChild className="gap-2">
              <Link href="/stock/add">
                <Plus size={16} /> ADD VEHICLE
              </Link>
            </Button>
          </div>
        </div>

        {/* Real KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-6">
          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Retail Stock</p>
            <p className="font-mono text-[20px] font-bold text-cream mt-1">{kpis.totalRetailUnits}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Active Forecourt</p>
          </div>

          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Stock Value</p>
            <p className="font-mono text-[20px] font-bold text-cream mt-1">{formatCurrency(kpis.totalStockValue)}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Total Invested Cost</p>
          </div>

          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Potential Gross</p>
            <p className="font-mono text-[20px] font-bold text-positive mt-1">{formatCurrency(kpis.potentialGrossMargin)}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Avg {formatCurrency(kpis.averageGrossMargin)}/unit</p>
          </div>

          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Avg Days on Plot</p>
            <p className="font-mono text-[20px] font-bold text-cream mt-1">{kpis.averageDaysInStock}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Forecourt Velocity</p>
          </div>

          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Stock &gt; 45 Days</p>
            <p className={cn(
              "font-mono text-[20px] font-bold mt-1",
              kpis.vehiclesOver45Days > 0 ? "text-warning" : "text-cream"
            )}>
              {kpis.vehiclesOver45Days}
            </p>
            <p className="font-mono text-[10px] text-silver mt-0.5">{kpis.vehiclesOver60Days} over 60 days</p>
          </div>

          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">In Preparation</p>
            <p className="font-mono text-[20px] font-bold text-blue mt-1">{kpis.vehiclesInPreparation}</p>
            <Link href="/stock/preparation" className="font-mono text-[10px] text-blue hover:underline mt-0.5 block">
              View Prep Board →
            </Link>
          </div>

          <div className="bg-asphalt/70 border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Reserved</p>
            <p className="font-mono text-[20px] font-bold text-cream mt-1">{kpis.vehiclesReserved}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Pending Handover</p>
          </div>
        </div>

        {/* Status Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto border-b border-steel mt-6 pt-2">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                "font-mono text-[11px] uppercase tracking-wider pb-3 px-3 border-b-2 whitespace-nowrap transition-colors",
                statusTab === tab.id
                  ? "text-cream border-blue font-bold"
                  : "text-pewter border-transparent hover:text-silver"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-carbon/60 border-b border-steel px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter" size={15} />
            <Input
              placeholder="Search registration, VIN, make, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-[13px] bg-asphalt/80"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Location Filter */}
          {locations.length > 0 && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-[12px] text-cream focus:border-blue"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-[12px] text-cream focus:border-blue"
          >
            <option value="newest">Recently Added</option>
            <option value="oldest">Oldest Added</option>
            <option value="price_desc">Price (High to Low)</option>
            <option value="price_asc">Price (Low to High)</option>
            <option value="margin_desc">Highest Margin</option>
            <option value="days_desc">Longest in Stock</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-asphalt border border-steel rounded-[2px] p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-[2px] transition-colors",
                viewMode === 'table' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
              )}
              title="Table View (Operational)"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-[2px] transition-colors",
                viewMode === 'grid' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
              )}
              title="Grid View (Visual)"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-blue/10 border-b border-blue/30 px-6 py-2 flex items-center justify-between animate-in fade-in">
          <span className="font-mono text-[12px] text-cream font-medium">
            {selectedIds.length} VEHICLE{selectedIds.length > 1 ? 'S' : ''} SELECTED
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkArchive} 
              disabled={isBulkActioning}
              className="h-8 text-[11px] font-mono"
            >
              ARCHIVE SELECTED
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedIds([])}
              className="h-8 text-[11px] font-mono"
            >
              DESELECT ALL
            </Button>
          </div>
        </div>
      )}

      {/* Stock Content View */}
      <div className="flex-1 p-6">
        {filteredVehicles.length === 0 ? (
          <div className="border border-steel bg-carbon p-12 text-center rounded-[2px] max-w-xl mx-auto my-12">
            <Car size={40} className="mx-auto text-pewter mb-4" />
            <h3 className="font-syne font-bold text-lg text-cream mb-1">No stock matching filter</h3>
            <p className="font-inter text-sm text-silver mb-6">
              {search ? 'Try clearing your search query or status filter.' : 'Add your first vehicle to start building your ForecourIQ stockbook.'}
            </p>
            <Button asChild className="gap-2">
              <Link href="/stock/add">
                <Plus size={15} /> ADD NEW VEHICLE
              </Link>
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View — Operational Standard */
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-asphalt border-b border-steel">
                    <th className="py-3 px-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length === filteredVehicles.length && filteredVehicles.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded-[2px] bg-void border-steel"
                      />
                    </th>
                    <th className="py-3 px-3 font-mono text-[10px] text-pewter uppercase tracking-wider w-14">Media</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Registration</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Vehicle Details</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Mileage</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Total Cost</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Retail Price</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-right">Proj. Margin</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider text-center">Days</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 font-mono text-[10px] text-pewter uppercase tracking-wider">Advert</th>
                    <th className="py-3 px-4 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => {
                    const comms = calculateCommercials(vehicle)
                    const isSelected = selectedIds.includes(vehicle.id)
                    const primaryPhoto = vehicle.vehicle_images?.find(img => img.is_primary)?.url || vehicle.photos?.[0]
                    const readiness = checkAdvertisingReadiness(vehicle)

                    return (
                      <tr 
                        key={vehicle.id}
                        className={cn(
                          "border-b border-steel/60 hover:bg-asphalt/60 cursor-pointer transition-colors group",
                          isSelected && "bg-blue/5"
                        )}
                        onClick={() => router.push(`/stock/${vehicle.id}`)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectOne(vehicle.id)}
                            className="rounded-[2px] bg-void border-steel"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="w-12 h-9 bg-asphalt rounded-[2px] flex items-center justify-center border border-steel overflow-hidden">
                            {primaryPhoto ? (
                              <img src={primaryPhoto} alt={vehicle.registration} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={14} className="text-pewter" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[13px] font-bold text-cream bg-void border border-steel px-2 py-0.5 rounded-[2px]">
                            {formatRegistration(vehicle.registration)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-inter font-medium text-[13px] text-cream truncate max-w-[220px]">
                            <span className="text-silver mr-1">{vehicle.year}</span>
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="font-inter text-[11px] text-silver truncate max-w-[220px]">
                            {vehicle.variant || `${vehicle.fuel_type || ''} ${vehicle.transmission || ''}`}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[12px] text-silver">
                          {vehicle.mileage.toLocaleString()} mi
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[12px] text-silver">
                          {formatCurrency(comms.totalInvestedCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[13px] font-bold text-cream">
                          {vehicle.asking_price > 0 ? formatCurrency(vehicle.asking_price) : <span className="text-warning text-[11px]">NOT SET</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[12px]">
                          <span className={
                            comms.projectedGrossMargin > 3000 ? "text-positive font-bold" : 
                            comms.projectedGrossMargin > 1000 ? "text-cream" : "text-negative"
                          }>
                            {formatCurrency(comms.projectedGrossMargin)}
                          </span>
                          <span className="text-[10px] text-pewter block">
                            ({comms.projectedMarginPercent.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[12px]">
                          <span className={
                            comms.daysOwned < 30 ? "text-positive" : 
                            comms.daysOwned <= 45 ? "text-silver" : 
                            comms.daysOwned <= 60 ? "text-warning font-bold" : "text-negative font-bold"
                          }>
                            {comms.daysOwned}d
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            vehicle.status === 'available' || vehicle.status === 'advertised' ? 'default' :
                            vehicle.status === 'ready_for_sale' ? 'positive' :
                            vehicle.status === 'reserved' ? 'warning' :
                            vehicle.status === 'sold' ? 'positive' : 'secondary'
                          } className="font-mono text-[10px] uppercase">
                            {vehicle.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {readiness.isReady ? (
                            <span className="flex items-center gap-1 font-mono text-[10px] text-positive">
                              <CheckCircle2 size={12} /> READY
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-mono text-[10px] text-warning" title={readiness.missingItems.join(', ')}>
                              <AlertTriangle size={12} /> INCOMPLETE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-pewter group-hover:text-cream transition-colors">
                          <ChevronRight size={15} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View — Visual Stock Presentation */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredVehicles.map(vehicle => {
              const comms = calculateCommercials(vehicle)
              const primaryPhoto = vehicle.vehicle_images?.find(img => img.is_primary)?.url || vehicle.photos?.[0]
              const readiness = checkAdvertisingReadiness(vehicle)

              return (
                <div
                  key={vehicle.id}
                  onClick={() => router.push(`/stock/${vehicle.id}`)}
                  className="bg-carbon border border-steel hover:border-slate rounded-[2px] overflow-hidden cursor-pointer transition-all flex flex-col group"
                >
                  <div className="relative aspect-[16/10] bg-asphalt flex items-center justify-center overflow-hidden border-b border-steel">
                    {primaryPhoto ? (
                      <img src={primaryPhoto} alt={vehicle.registration} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-pewter">
                        <ImageIcon size={24} />
                        <span className="font-mono text-[10px] uppercase tracking-wider">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="font-mono text-[11px] font-bold text-cream bg-void/90 border border-steel px-2 py-0.5 rounded-[2px]">
                        {formatRegistration(vehicle.registration)}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant={
                        vehicle.status === 'available' || vehicle.status === 'advertised' ? 'default' :
                        vehicle.status === 'ready_for_sale' ? 'positive' :
                        vehicle.status === 'reserved' ? 'warning' : 'secondary'
                      } className="font-mono text-[9px] uppercase shadow">
                        {vehicle.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-syne font-bold text-[15px] text-cream truncate">
                        <span className="text-silver mr-1.5">{vehicle.year}</span>
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="font-inter text-[12px] text-silver truncate mt-0.5">
                        {vehicle.variant || `${vehicle.fuel_type || ''} ${vehicle.transmission || ''}`}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-steel/60 font-mono text-[11px] text-pewter">
                        <span>{vehicle.mileage.toLocaleString()} miles</span>
                        <span className={comms.daysOwned > 45 ? "text-warning font-bold" : "text-silver"}>
                          {comms.daysOwned} days
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-steel flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Retail Price</p>
                        <p className="font-mono text-[16px] font-bold text-cream mt-0.5">
                          {vehicle.asking_price > 0 ? formatCurrency(vehicle.asking_price) : '£—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Margin</p>
                        <p className={cn(
                          "font-mono text-[13px] font-bold mt-0.5",
                          comms.projectedGrossMargin > 1500 ? "text-positive" : "text-cream"
                        )}>
                          {formatCurrency(comms.projectedGrossMargin)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
