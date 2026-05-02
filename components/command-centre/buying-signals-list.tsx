'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function BuyingSignalsList({ initialSignals }: { initialSignals: any[] }) {
  const [signals, setSignals] = useState(initialSignals)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      // In a real app this would call the API route
      // const res = await fetch('/api/ai/buying-signals', { method: 'POST' })
      // const data = await res.json()
      // setSignals(data.signals)
      
      // For demo, we just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Signals regenerated successfully')
    } catch (error) {
      toast.error('Failed to regenerate signals')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleDismiss = (id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id))
    toast.success('Signal dismissed')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-mono text-[11px] text-pewter uppercase tracking-widest">Today's Buying Signals</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="h-8 text-[11px]"
        >
          {isRegenerating ? <Loader2 className="animate-spin mr-2" size={14} /> : <RefreshCw className="mr-2" size={14} />}
          REGENERATE WITH AI
        </Button>
      </div>

      <div className="space-y-3">
        {signals.length > 0 ? signals.map(signal => (
          <div 
            key={signal.id} 
            className="bg-carbon border border-steel hover:border-blue p-5 rounded-[2px] transition-all"
          >
            {/* Top Row */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-syne font-bold text-base text-cream">{signal.make} {signal.model}</h3>
                <p className="font-mono text-[11px] text-pewter mt-0.5">
                  {signal.year_min}-{signal.year_max} · {signal.fuel_type?.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-pewter mb-0.5">SCORE</p>
                <p className="font-mono text-3xl text-blue leading-none font-bold">{signal.demand_score}</p>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 mb-4 bg-void p-3 rounded-[2px] border border-steel/50">
              <div>
                <p className="font-mono text-[10px] text-pewter mb-1">BUY AT</p>
                <p className="font-mono text-[13px] text-cream">{formatCurrency(signal.target_buy_price)}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-pewter mb-1">RETAIL</p>
                <p className="font-mono text-[13px] text-cream">{formatCurrency(signal.projected_retail)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-pewter mb-1">MARGIN</p>
                <p className="font-mono text-[14px] text-positive font-bold">{formatCurrency(signal.projected_margin)}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mb-4">
              <p className="font-mono text-[11px] text-silver">EST DAYS: <span className="text-cream">{signal.days_to_sell_estimate}</span></p>
              <p className="font-mono text-[11px] text-silver">
                DEMAND: <span className={cn(
                  signal.demand_score > 80 ? "text-blue" : signal.demand_score > 50 ? "text-warning" : "text-pewter"
                )}>
                  {signal.demand_score > 80 ? 'HIGH' : signal.demand_score > 50 ? 'MED' : 'LOW'}
                </span>
              </p>
            </div>

            {/* Reasoning */}
            <div className="mb-4">
              <p className={cn(
                "font-inter text-[13px] text-silver italic cursor-pointer transition-all",
                expandedReasoning === signal.id ? "" : "line-clamp-2"
              )} onClick={() => setExpandedReasoning(expandedReasoning === signal.id ? null : signal.id)}>
                "{signal.reasoning}"
              </p>
              {expandedReasoning !== signal.id && (
                <button 
                  onClick={() => setExpandedReasoning(signal.id)}
                  className="font-inter text-[12px] text-blue hover:underline mt-1"
                >
                  Read more
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-steel">
              <button 
                onClick={() => handleDismiss(signal.id)}
                className="font-mono text-[10px] text-pewter hover:text-negative uppercase tracking-wider transition-colors"
              >
                Dismiss
              </button>
              <button 
                className="font-mono text-[11px] text-blue hover:text-cream uppercase tracking-wider transition-colors font-bold"
              >
                PURCHASED →
              </button>
            </div>
          </div>
        )) : (
          <div className="py-12 text-center border border-dashed border-steel rounded-[2px] bg-carbon">
            <p className="font-inter text-sm text-pewter">No active buying signals.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleRegenerate} disabled={isRegenerating}>
              {isRegenerating ? 'GENERATING...' : 'GENERATE NEW SIGNALS'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
