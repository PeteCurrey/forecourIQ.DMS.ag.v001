'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, List, KanbanSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import LeadKanban from '@/components/leads/lead-kanban'
import LeadTable from '@/components/leads/lead-table'

export default function LeadsClient({ initialLeads }: { initialLeads: any[] }) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  
  // Realtime updates would be handled here via Supabase realtime subscription
  // For now, we'll just use the initial leads
  const [leads, setLeads] = useState(initialLeads)

  const filteredLeads = leads.filter(lead => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      lead.first_name?.toLowerCase().includes(term) ||
      lead.last_name?.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      (lead.vehicles as any)?.registration?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-void">
      {/* Header & Filters */}
      <div className="bg-carbon border-b border-steel p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-syne font-bold text-2xl text-cream mr-4">Leads</h1>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter" size={16} />
            <Input 
              placeholder="Search leads..." 
              className="pl-9 h-9 text-[13px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9">NEW LEAD</Button>
          
          <div className="flex items-center bg-asphalt border border-steel rounded-[2px] p-0.5">
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-1.5 rounded-[2px] transition-colors",
                viewMode === 'kanban' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
              )}
            >
              <KanbanSquare size={16} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-[2px] transition-colors",
                viewMode === 'table' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {viewMode === 'kanban' ? (
          <LeadKanban leads={filteredLeads} setLeads={setLeads} />
        ) : (
          <div className="h-full overflow-y-auto px-6 py-6">
            <LeadTable leads={filteredLeads} />
          </div>
        )}
      </div>
    </div>
  )
}
