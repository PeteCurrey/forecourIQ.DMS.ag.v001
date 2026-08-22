'use client'

import { format } from 'date-fns'
import PortfolioHealthGauge from '@/components/command-centre/portfolio-health-gauge'
import MarketIntelPanel, { MarketObservation, StockItem } from '@/components/command-centre/market-intel-panel'
import AiChat from '@/components/command-centre/ai-chat'
import BuyingSignalsList from '@/components/command-centre/buying-signals-list'
import { formatCurrency } from '@/lib/format'

export interface DealershipInfo {
  id: string
  name: string
  city?: string
  county?: string
}

export interface BuyingSignalItem {
  id: string
  make: string
  model: string
  year_min?: number
  year_max?: number
  fuel_type?: string
  mileage_max?: number
  target_buy_price?: number
  projected_retail?: number
  projected_margin?: number
  days_to_sell_estimate?: number
  demand_score?: number
  reasoning?: string
  status: string
}

export interface VehicleStockRecord extends StockItem {
  purchase_price?: number
  prep_cost?: number
  transport_cost?: number
}

export default function CommandCentreClient({ 
  dealership, 
  initialSignals = [], 
  marketData = [], 
  stock = [] 
}: { 
  dealership: DealershipInfo 
  initialSignals: BuyingSignalItem[] 
  marketData: MarketObservation[]
  stock: VehicleStockRecord[]
}) {
  // Calculate metrics from real data
  const activeSignalsCount = initialSignals.length
  
  const avgMargin = activeSignalsCount > 0 
    ? initialSignals.reduce((acc, curr) => acc + Number(curr.projected_margin || 0), 0) / activeSignalsCount
    : 0

  const avgDays = activeSignalsCount > 0
    ? initialSignals.reduce((acc, curr) => acc + Number(curr.days_to_sell_estimate || 0), 0) / activeSignalsCount
    : 0

  // Calculate portfolio health (0-100) based on real margin potential and stock presence
  let portfolioHealth = 70
  
  if (stock.length > 0) {
    const totalPotentialMargin = stock.reduce((acc, v) => {
      const cost = Number(v.purchase_price || 0) + Number(v.prep_cost || 0) + Number(v.transport_cost || 0)
      return acc + (Number(v.asking_price || 0) - cost)
    }, 0)
    
    if (totalPotentialMargin / stock.length > 3000) portfolioHealth += 10
    if (stock.length > 10) portfolioHealth += 5
    portfolioHealth = Math.min(95, portfolioHealth)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void">
      {/* Header */}
      <div className="bg-carbon border-b border-steel p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 max-w-[1400px] mx-auto">
          <div>
            <h1 className="font-syne font-bold text-[28px] text-cream mb-1">Buying Command Centre</h1>
            <p className="font-inter text-[14px] text-pewter">
              Market intelligence and AI recommendations for {dealership.county || dealership.city || 'your dealership'} · Active telemetry
            </p>
          </div>
          <div className="font-mono text-[11px] text-pewter uppercase tracking-widest bg-asphalt px-3 py-1.5 border border-steel rounded-[2px]">
            LAST UPDATED: {format(new Date(), 'dd MMM yyyy')}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6 pb-20">
        
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PortfolioHealthGauge score={portfolioHealth} />
          
          <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em]">Active Buying Signals</p>
            <p className="font-syne font-bold text-[48px] text-cream leading-none">{activeSignalsCount}</p>
          </div>
          
          <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em]">Avg Projected Margin</p>
            <p className="font-mono text-[40px] text-positive font-bold leading-none">{formatCurrency(avgMargin)}</p>
          </div>
          
          <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col justify-between">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em]">Avg Days to Sell</p>
            <div className="flex items-end gap-2">
              <p className="font-mono text-[48px] text-warning font-bold leading-none">{Math.round(avgDays)}</p>
              <p className="font-mono text-[14px] text-pewter mb-2">days</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Signals List (60%) */}
          <div className="xl:col-span-7">
            <BuyingSignalsList initialSignals={initialSignals} />
          </div>
          
          {/* Right Column: Market Intel (40%) */}
          <div className="xl:col-span-5 space-y-6">
            <MarketIntelPanel marketData={marketData} stock={stock} />
          </div>
        </div>
        
        {/* Bottom Area: AI Chat */}
        <AiChat dealershipName={dealership.name} location={dealership.county || dealership.city} />
        
      </div>
    </div>
  )
}
