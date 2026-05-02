'use client'

import { Input } from '@/components/ui/input'
import { Search, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockFiltersProps {
  viewMode: 'table' | 'grid'
  setViewMode: (mode: 'table' | 'grid') => void
  search: string
  setSearch: (search: string) => void
  status: string
  setStatus: (status: string) => void
}

export default function StockFilters({
  viewMode, setViewMode, search, setSearch, status, setStatus
}: StockFiltersProps) {
  return (
    <div className="sticky top-14 z-30 bg-carbon border-b border-steel p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter" size={16} />
          <Input 
            placeholder="Search reg, make, model..." 
            className="pl-9 h-9 text-[13px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 text-[13px] text-cream font-inter focus:outline-none focus:border-blue hidden sm:block"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="prep">In Prep</option>
          <option value="sold">Sold</option>
        </select>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <select className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 text-[13px] text-cream font-inter focus:outline-none focus:border-blue">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_asc">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
        </select>

        <div className="flex items-center bg-asphalt border border-steel rounded-[2px] p-0.5">
          <button 
            onClick={() => setViewMode('table')}
            className={cn(
              "p-1.5 rounded-[2px] transition-colors",
              viewMode === 'table' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
            )}
          >
            <List size={16} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded-[2px] transition-colors",
              viewMode === 'grid' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
            )}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
