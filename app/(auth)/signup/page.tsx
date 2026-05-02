'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signupSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      dealershipName: searchParams.get('name') || '',
      email: searchParams.get('email') || '',
      password: '',
      plan: (searchParams.get('plan') as any) || 'professional',
    }
  })

  const selectedPlan = watch('plan')

  async function onSubmit(data: any) {
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
    <div className="w-full max-w-[480px] space-y-8 py-12">
      <div>
        <h2 className="font-syne font-bold text-2xl text-cream">Start your free trial</h2>
        <p className="font-inter text-sm text-silver mt-1">14 days free. No credit card required.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-inter text-[13px] text-silver">Full Name</label>
            <Input {...register('fullName')} className="bg-carbon border-steel" placeholder="John Smith" />
            {errors.fullName && <p className="text-negative text-xs">{errors.fullName.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="font-inter text-[13px] text-silver">Dealership Name</label>
            <Input {...register('dealershipName')} className="bg-carbon border-steel" placeholder="Prestige Motors" />
            {errors.dealershipName && <p className="text-negative text-xs">{errors.dealershipName.message as string}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-inter text-[13px] text-silver">Email Address</label>
          <Input {...register('email')} type="email" className="bg-carbon border-steel" placeholder="name@dealership.co.uk" />
          {errors.email && <p className="text-negative text-xs">{errors.email.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="font-inter text-[13px] text-silver">Password</label>
          <Input {...register('password')} type="password" className="bg-carbon border-steel" />
          {errors.password && <p className="text-negative text-xs">{errors.password.message as string}</p>}
        </div>

        <div className="space-y-4">
          <label className="font-inter text-[13px] text-silver">Select Plan</label>
          <div className="grid grid-cols-1 gap-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setValue('plan', plan.id as any)}
                className={cn(
                  "flex items-center justify-between p-4 border transition-all rounded-[2px] bg-carbon",
                  selectedPlan === plan.id ? "border-blue ring-1 ring-blue" : "border-steel hover:border-pewter"
                )}
              >
                <div className="text-left">
                  <p className="font-syne font-bold text-cream text-[15px]">{plan.name}</p>
                  <p className="font-inter text-[12px] text-silver">£{plan.price}/month · 14-day trial</p>
                </div>
                {selectedPlan === plan.id && (
                  <div className="w-4 h-4 rounded-full bg-blue border-2 border-void flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-void" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <Button 
          type="submit" 
          variant="outline" 
          className="w-full h-12 border-blue text-blue hover:bg-blue hover:text-void font-syne font-bold text-[13px] tracking-[0.08em]"
          disabled={isLoading}
        >
          {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </Button>
      </form>

      <div className="text-center">
        <p className="font-inter text-sm text-pewter">
          Already have an account?{' '}
          <Link href="/login" className="text-blue hover:underline">
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
      
      {/* Left Panel - Brand (Shared with Login) */}
      <div className="hidden md:flex md:w-1/2 bg-carbon border-r border-steel flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="font-syne font-bold text-[28px] text-cream tracking-tight">Forecour</span>
          <span className="font-syne font-bold text-[28px] text-blue tracking-tight">IQ</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-syne italic font-semibold text-5xl text-cream leading-[1.1] tracking-tight">
            Built for dealers who think <span className="text-blue">differently.</span>
          </h1>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center px-4 py-2 bg-void border border-steel rounded-[2px]">
            <span className="font-mono text-[11px] text-pewter uppercase tracking-widest">JOIN 200+ INDEPENDENT DEALERS</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form wrapped in Suspense */}
      <div className="flex-1 flex items-center justify-center p-8 bg-void overflow-y-auto">
        <Suspense fallback={<div className="text-silver font-mono text-xs uppercase tracking-widest">Loading...</div>}>
          <SignupForm />
        </Suspense>
      </div>

    </div>
  )
}
