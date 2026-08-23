'use client'

import React, { useState } from 'react'
import { DealRecord, calcDealKPIs } from '@/lib/services/deal-calc'
import { DealKanban } from '@/components/deals/deal-kanban'
import { DealTable } from '@/components/deals/deal-table'
import { Plus, LayoutGrid, List, Search, Filter, RefreshCw, Handshake } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface DealsClientProps {
  initialDeals: DealRecord[]
  canReadMargin: boolean
  teamMembers: Array<{ id: string; full_name: string; email: string }>
  vehicles: Array<{ id: string; make: string; model: string; registration: string; asking_price: number }>
  customers: Array<{ id: string; first_name: string; last_name: string; email?: string; phone?: string }>
  currentUser: { id: string; full_name?: string; role?: string }
}

export default function DealsClient({
  initialDeals,
  canReadMargin,
  teamMembers,
  vehicles,
  customers,
  currentUser,
}: DealsClientProps) {
  const [deals, setDeals] = useState<DealRecord[]>(initialDeals)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all')
  const [selectedMethod, setSelectedMethod] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const kpis = calcDealKPIs(deals)

  const refreshDeals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      if (data.deals) setDeals(data.deals)
    } catch {
      toast.error('Failed to refresh deals')
    } finally {
      setLoading(false)
    }
  }

  const filteredDeals = deals.filter((deal) => {
    if (selectedSalesperson !== 'all' && deal.salesperson_id !== selectedSalesperson) return false
    if (selectedMethod !== 'all' && deal.payment_method !== selectedMethod) return false
    if (search) {
      const q = search.toLowerCase()
      const refMatch = deal.deal_reference?.toLowerCase().includes(q)
      const custMatch = deal.customers
        ? `${deal.customers.first_name} ${deal.customers.last_name}`.toLowerCase().includes(q)
        : false
      const vehMatch = deal.vehicles
        ? `${deal.vehicles.registration} ${deal.vehicles.make} ${deal.vehicles.model}`.toLowerCase().includes(q)
        : false
      return refMatch || custMatch || vehMatch
    }
    return true
  })

  return (
    <div className="flex flex-col h-full overflow-hidden text-cream">
      {/* Top Header */}
      <div className="p-6 pb-4 border-b border-steel flex flex-wrap items-center justify-between gap-4 bg-carbon shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-syne font-bold text-2xl tracking-tight text-cream">Deal Desk</h1>
            <span className="bg-blue/10 text-blue border border-blue/20 px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase font-bold tracking-wider">
              COMMERCIAL ENGINE
            </span>
          </div>
          <p className="font-inter text-xs text-pewter mt-0.5">
            Structuring, part exchange appraisals, holding deposits, and delivery handover.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/deals/new"
            className="bg-blue hover:bg-blue/90 text-cream px-3 py-1.5 rounded-[2px] font-inter text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus size={14} /> Structure New Deal
          </Link>
        </div>
      </div>

      {/* KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border-b border-steel bg-carbon/50 divide-x divide-steel/40 shrink-0 text-xs">
        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Active Deals</span>
          <span className="font-mono text-base font-bold text-cream">{kpis.openDeals}</span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Agreed Today</span>
          <span className="font-mono text-base font-bold text-blue">{kpis.agreedToday}</span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Deposit Due</span>
          <span className="font-mono text-base font-bold text-warning">{kpis.depositsOutstanding}</span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Finance Pending</span>
          <span className="font-mono text-base font-bold text-silver">{kpis.financePending}</span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Handovers Today</span>
          <span className="font-mono text-base font-bold text-cream">{kpis.handoversToday}</span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Sold This Month</span>
          <span className="font-mono text-base font-bold text-positive">{kpis.completedThisMonth}</span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Projected Gross</span>
          <span className="font-mono text-base font-bold text-cream">
            {canReadMargin ? `£${kpis.projectedGross.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
          </span>
        </div>

        <div className="p-3">
          <span className="text-[10px] font-mono text-pewter uppercase block truncate">Actual Margin</span>
          <span className="font-mono text-base font-bold text-positive">
            {canReadMargin ? `£${kpis.actualGross.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
          </span>
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="p-4 border-b border-steel bg-carbon flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pewter" />
            <input
              type="text"
              placeholder="Search reference, customer, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-asphalt border border-steel rounded-[2px] font-inter text-xs text-cream focus:border-blue outline-none placeholder:text-pewter/60"
            />
          </div>

          <select
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            className="bg-asphalt border border-steel px-2.5 py-1.5 rounded-[2px] text-cream text-xs outline-none focus:border-blue"
          >
            <option value="all">All Sales Executives</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-asphalt border border-steel px-2.5 py-1.5 rounded-[2px] text-cream text-xs outline-none focus:border-blue"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash / Direct</option>
            <option value="finance">Finance</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshDeals}
            disabled={loading}
            className="p-1.5 bg-asphalt border border-steel rounded-[2px] text-pewter hover:text-cream transition"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="flex items-center border border-steel rounded-[2px] overflow-hidden bg-asphalt">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 transition ${viewMode === 'kanban' ? 'bg-blue text-cream' : 'text-pewter hover:text-cream'}`}
              title="Pipeline View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition ${viewMode === 'table' ? 'bg-blue text-cream' : 'text-pewter hover:text-cream'}`}
              title="Table View"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-void">
        {viewMode === 'kanban' ? (
          <DealKanban deals={filteredDeals} setDeals={setDeals} canReadMargin={canReadMargin} />
        ) : (
          <DealTable deals={filteredDeals} canReadMargin={canReadMargin} />
        )}
      </div>
    </div>
  )
}
