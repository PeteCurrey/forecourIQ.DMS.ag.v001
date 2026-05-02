'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function StepComplete({ dealership }: { dealership: any }) {
  const router = useRouter()

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center text-center">
      <div className="space-y-6">
        <h1 className="font-syne italic font-semibold text-[80px] text-cream leading-none tracking-tight">
          You're ready.
        </h1>
        
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[11px] text-blue uppercase tracking-[0.2em]">
            {dealership?.name?.toUpperCase() || 'HARTWELL MOTOR GROUP'} · ELITE PLAN · ACTIVE
          </span>
          <div className="h-px w-24 bg-blue/30" />
        </div>
        
        <div className="max-w-md mx-auto">
          <p className="font-inter text-xl text-silver leading-relaxed">
            Your DMS is set up. Your 14-day trial has started. Add your first vehicle to get started.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button 
          onClick={() => router.push('/stock/add')} 
          className="h-16 border-blue text-blue hover:bg-blue hover:text-void font-syne font-bold text-lg tracking-wider"
          variant="outline"
        >
          ADD YOUR FIRST VEHICLE →
        </Button>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="h-12 text-pewter hover:text-cream font-syne font-bold text-[13px] tracking-widest transition-colors uppercase"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}
