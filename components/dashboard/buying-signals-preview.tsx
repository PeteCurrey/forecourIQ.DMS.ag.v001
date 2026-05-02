import { formatCurrency } from '@/lib/format'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function BuyingSignalsPreview({ signals }: { signals: any[] }) {
  return (
    <div className="bg-carbon border border-steel rounded-[2px] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne font-bold text-base text-cream">Today's Top Signals</h2>
        <Link href="/command-centre" className="font-mono text-[11px] text-blue hover:underline uppercase tracking-wider flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {signals.length > 0 ? signals.map((signal) => (
          <div key={signal.id} className="bg-asphalt border border-steel p-5 rounded-[2px] hover:border-blue transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-syne font-bold text-base text-cream">{signal.make} {signal.model}</p>
                <p className="font-mono text-[11px] text-pewter mt-0.5">
                  {signal.year_min}-{signal.year_max} · {signal.fuel_type?.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-pewter mb-0.5">SCORE</p>
                <p className="font-mono text-2xl text-blue leading-none">{signal.demand_score}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono mb-4 bg-void p-3 rounded-[2px]">
              <div>
                <p className="text-pewter mb-1">BUY AT</p>
                <p className="text-cream">{formatCurrency(signal.target_buy_price)}</p>
              </div>
              <div>
                <p className="text-pewter mb-1">RETAIL</p>
                <p className="text-cream">{formatCurrency(signal.projected_retail)}</p>
              </div>
              <div className="text-right">
                <p className="text-pewter mb-1">MARGIN</p>
                <p className="text-positive">{formatCurrency(signal.projected_margin)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] text-silver">EST DAYS: <span className="text-cream">{signal.days_to_sell_estimate}</span></p>
              <div className="flex gap-2">
                <button className="font-mono text-[10px] text-pewter hover:text-silver uppercase tracking-wider transition-colors">Dismiss</button>
                <button className="font-mono text-[10px] text-blue hover:text-cream uppercase tracking-wider transition-colors">Purchased →</button>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-3 py-12 text-center border border-dashed border-steel rounded-[2px]">
            <p className="font-inter text-sm text-pewter">No active buying signals. The AI is analyzing the market.</p>
          </div>
        )}
      </div>
    </div>
  )
}
