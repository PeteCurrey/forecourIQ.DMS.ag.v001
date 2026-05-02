'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, ExternalLink, ShieldCheck } from 'lucide-react'

export default function StepIntegrations({ dealership, onComplete, onBack }: { dealership: any, onComplete: () => void, onBack: () => void }) {
  const [connections, setConnections] = useState<string[]>([])

  const PORTALS = [
    { id: 'autotrader', name: 'AutoTrader', desc: 'UK\'s largest automotive marketplace.' },
    { id: 'ebay', name: 'eBay Motors', desc: 'Reach millions of active buyers.' },
    { id: 'cargurus', name: 'CarGurus', desc: 'Data-driven marketplace.' },
    { id: 'motors', name: 'Motors.co.uk', desc: 'Multi-platform exposure.' },
    { id: 'facebook', name: 'Facebook Marketplace', desc: 'Social local selling.' },
    { id: 'dvla', name: 'DVLA', desc: 'Official vehicle data lookup.' },
  ]

  const toggleConnection = (id: string) => {
    setConnections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h1 className="font-syne font-bold text-6xl text-cream leading-[1.1] tracking-tight">
          Connect your portals.
        </h1>
        <p className="font-inter text-xl text-silver">
          You can skip this and connect later in Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PORTALS.map((portal) => (
          <div
            key={portal.id}
            className={cn(
              "p-6 border rounded-[2px] transition-all bg-carbon group relative",
              connections.includes(portal.id) ? "border-blue" : "border-steel hover:border-pewter"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-syne font-bold text-lg text-cream">{portal.name}</h3>
              {connections.includes(portal.id) ? (
                <div className="w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center text-blue">
                  <Check size={14} />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-void border border-steel flex items-center justify-center text-pewter">
                  <ExternalLink size={12} />
                </div>
              )}
            </div>
            <p className="font-inter text-[13px] text-silver mb-6">{portal.desc}</p>
            <button 
              onClick={() => toggleConnection(portal.id)}
              className={cn(
                "w-full py-2 rounded-[2px] font-mono text-[10px] uppercase tracking-widest transition-all",
                connections.includes(portal.id) 
                  ? "bg-blue/10 text-blue border border-blue/20" 
                  : "bg-asphalt text-pewter border border-steel hover:text-silver hover:border-slate"
              )}
            >
              {connections.includes(portal.id) ? 'CONNECTED' : 'CONNECT'}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-8 flex flex-col items-start gap-6">
        <div className="flex items-center gap-6 w-full">
          <Button 
            onClick={onComplete} 
            className="h-14 px-12 border-blue text-blue hover:bg-blue hover:text-void font-syne font-bold text-lg"
            variant="outline"
          >
            Continue →
          </Button>
          <button onClick={onBack} className="text-pewter hover:text-silver font-mono text-[11px] uppercase tracking-widest">
            Go back
          </button>
        </div>
        
        <button 
          onClick={onComplete}
          className="text-pewter hover:text-cream font-inter text-sm transition-colors border-b border-muted hover:border-cream pb-0.5"
        >
          Skip all for now →
        </button>
      </div>
    </div>
  )
}
