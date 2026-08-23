'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { signupSchema } from '@/lib/validations'
import { toast } from 'sonner'
import Link from 'next/link'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ArrowRight, Check } from 'lucide-react'

type SignupFormData = z.infer<typeof signupSchema>

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const defaultPlan = (searchParams.get('plan') as 'starter' | 'professional' | 'elite') || 'professional'

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      dealershipName: searchParams.get('name') || '',
      email: searchParams.get('email') || '',
      password: '',
      plan: defaultPlan,
    }
  })

  const selectedPlan = watch('plan')

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true)
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          dealership_name: data.dealershipName,
          plan: data.plan,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      }
    })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success('Check your email to confirm your account.')
    router.push('/onboarding')
  }

  return (
    <div className="w-full max-w-[420px] space-y-6 py-6">
      <div className="space-y-1.5">
        <h2 className="font-syne font-bold text-2xl text-[#1C1F26] tracking-tight">Start your 14-day trial</h2>
        <p className="font-inter text-[13px] text-[#5C6478]">No credit card required · Instant access</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block font-inter text-[12px] font-medium text-[#353D4C]">Your name</label>
            <input
              {...register('fullName')}
              placeholder="Peter Currey"
              className="w-full bg-white border border-[#D5D1C8] h-10 px-3 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
            />
            {errors.fullName && <p className="text-rose-600 text-[11px] font-inter">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="block font-inter text-[12px] font-medium text-[#353D4C]">Dealership</label>
            <input
              {...register('dealershipName')}
              placeholder="Hartwell Motor Group"
              className="w-full bg-white border border-[#D5D1C8] h-10 px-3 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
            />
            {errors.dealershipName && <p className="text-rose-600 text-[11px] font-inter">{errors.dealershipName.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block font-inter text-[12px] font-medium text-[#353D4C]">Work email address</label>
          <input
            {...register('email')}
            type="email"
            placeholder="peter@dealership.co.uk"
            className="w-full bg-white border border-[#D5D1C8] h-10 px-3 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
          />
          {errors.email && <p className="text-rose-600 text-[11px] font-inter">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block font-inter text-[12px] font-medium text-[#353D4C]">Password</label>
          <input
            {...register('password')}
            type="password"
            placeholder="Minimum 8 characters"
            className="w-full bg-white border border-[#D5D1C8] h-10 px-3 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
          />
          {errors.password && <p className="text-rose-600 text-[11px] font-inter">{errors.password.message}</p>}
        </div>

        <div className="space-y-2 pt-1">
          <label className="block font-inter text-[12px] font-medium text-[#353D4C]">Select tier</label>
          <div className="grid grid-cols-3 gap-2">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setValue('plan', plan.id as 'starter' | 'professional' | 'elite')}
                className={cn(
                  "p-2.5 border rounded-[2px] text-left transition-all bg-white",
                  selectedPlan === plan.id 
                    ? "border-[#0EA5E9] ring-1 ring-[#0EA5E9] bg-[#0EA5E9]/5" 
                    : "border-[#D5D1C8] hover:border-[#9DA8B7]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-inter font-semibold text-[12px] text-[#1C1F26]">{plan.name}</span>
                  {selectedPlan === plan.id && <Check size={12} className="text-[#0EA5E9]" />}
                </div>
                <p className="font-mono text-[11px] text-[#5C6478] mt-0.5">£{plan.price}/mo</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#0EA5E9] hover:bg-[#0284C7] active:bg-[#0369A1] text-white rounded-[2px] font-inter font-medium text-[13px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4 cursor-pointer"
        >
          {isLoading ? 'Creating account...' : 'Create dealership account'}
          {!isLoading && <ArrowRight size={14} />}
        </button>
      </form>

      <div className="pt-2 text-center border-t border-[#E2DFC9]">
        <p className="font-inter text-[12px] text-[#5C6478]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0EA5E9] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-void flex flex-col md:flex-row overflow-hidden">

      {/* Left 50% — Dark Cinematic Automotive Image */}
      <div className="relative md:w-1/2 h-56 md:h-auto min-h-[220px] md:min-h-screen flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#07080B]">
        {/* Aston Martin Hero Asset */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-85 scale-100"
          style={{ backgroundImage: 'url("/images/supercar-hero.png")' }}
        />

        {/* Restrained Cinematic Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Top-Left Logo */}
        <div className="relative z-10 flex items-center gap-1">
          <span className="font-syne font-bold text-2xl text-[#EDE8DC] tracking-tight">Forecour</span>
          <span className="font-syne font-bold text-2xl text-[#0EA5E9] tracking-tight">IQ</span>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 max-w-sm hidden md:block">
          <p className="font-syne font-semibold text-2xl text-[#EDE8DC] tracking-tight leading-snug">
            Intelligence for the modern forecourt.
          </p>
          <p className="font-inter text-[12px] text-[#9DA8B7] mt-1.5 leading-relaxed">
            Automotive stockbook, deal governance, and buying intelligence designed for UK independent dealerships.
          </p>
        </div>
      </div>

      {/* Right 50% — Light Warm Neutral Authentication Surface */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#F3F2EE] min-h-[calc(100vh-220px)] md:min-h-screen">
        <Suspense fallback={<div className="text-[#5C6478] font-inter text-xs">Loading trial signup...</div>}>
          <SignupForm />
        </Suspense>
      </div>

    </div>
  )
}
