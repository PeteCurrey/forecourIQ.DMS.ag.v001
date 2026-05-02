'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { toast } from 'sonner'

export default function StepPlan({ dealership, onComplete, onBack }: { dealership: any, onComplete: () => void, onBack: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('professional')

  async function handlePlanSelection() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      })
      
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to initiate checkout')
      }
    } catch (error: any) {
      toast.error(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h1 className="font-syne font-bold text-6xl text-cream leading-[1.1] tracking-tight">
          Choose your plan.
        </h1>
        <p className="font-inter text-xl text-silver">
          14-day free trial on all plans. Cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={cn(
              "p-8 border rounded-[2px] transition-all flex flex-col items-start bg-carbon relative overflow-hidden group text-left",
              selectedPlan === plan.id 
                ? "border-blue ring-1 ring-blue" 
                : "border-steel hover:border-pewter"
            )}
          >
            {selectedPlan === plan.id && (
              <div className="absolute top-4 right-4 text-blue">
                <Check size={20} />
              </div>
            )}
            
            <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-2">{plan.id}</p>
            <h3 className="font-syne font-bold text-2xl text-cream mb-4">{plan.name}</h3>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="font-mono text-3xl font-bold text-cream">£{plan.price}</span>
              <span className="font-mono text-[13px] text-pewter">/month</span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-silver leading-snug">
                  <span className="text-blue mt-0.5">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="pt-8 flex flex-col items-start gap-6">
        <div className="flex items-center gap-6 w-full">
          <Button 
            onClick={handlePlanSelection} 
            className="h-14 px-12 border-blue text-blue hover:bg-blue hover:text-void font-syne font-bold text-lg"
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? 'REDIRECTING TO STRIPE...' : `Start Trial on ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} →`}
          </Button>
          <button onClick={onBack} className="text-pewter hover:text-silver font-mono text-[11px] uppercase tracking-widest">
            Go back
          </button>
        </div>
        
        <button 
          onClick={onComplete}
          className="text-pewter hover:text-cream font-inter text-sm transition-colors border-b border-muted hover:border-cream pb-0.5"
        >
          Skip for now — remind me later
        </button>
      </div>
    </div>
  )
}
