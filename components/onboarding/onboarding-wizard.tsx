'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import StepDealership from './step-dealership'
import StepSpeciality from './step-speciality'
import StepPlan from './step-plan'
import StepIntegrations from './step-integrations'
import StepComplete from './step-complete'
import { cn } from '@/lib/utils'

export default function OnboardingWizard({ profile, dealership }: { profile: any, dealership: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(Number(searchParams.get('step')) || 1)
  const supabase = createClient()

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Progress Bar */}
      <div className="w-full h-1 bg-steel shrink-0">
        <div 
          className="h-full bg-blue transition-all duration-500 ease-out" 
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="px-12 py-8 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-syne font-bold text-xl text-cream">Forecour</span>
          <span className="font-syne font-bold text-xl text-blue">IQ</span>
        </div>
        
        <div className="flex items-center gap-8">
          <span className="font-mono text-[11px] text-pewter uppercase tracking-[0.15em]">STEP {step} OF 5</span>
          <button 
            onClick={handleSignOut}
            className="text-pewter hover:text-cream font-mono text-[11px] uppercase tracking-wider transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Wizard Content */}
      <div className="flex-1 flex flex-col justify-center px-12 pb-20">
        <div className="max-w-4xl mx-auto w-full">
          
          {step === 1 && (
            <StepDealership 
              dealership={dealership} 
              onComplete={nextStep} 
            />
          )}

          {step === 2 && (
            <StepSpeciality 
              dealership={dealership} 
              onComplete={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 3 && (
            <StepPlan 
              dealership={dealership} 
              onComplete={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 4 && (
            <StepIntegrations 
              dealership={dealership} 
              onComplete={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 5 && (
            <StepComplete 
              dealership={dealership} 
            />
          )}

        </div>
      </div>

    </div>
  )
}
