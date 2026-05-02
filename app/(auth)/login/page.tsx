'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { loginSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
    }
  })

  async function onSubmit(data: any) {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const fillDemo = () => {
    setValue('email', 'demo@forecouriq.co.uk')
    setValue('password', 'ForecourtIQ2026!')
  }

  return (
    <div className="w-full max-w-[400px] space-y-8">
      <div>
        <div className="md:hidden flex items-center gap-2 mb-8">
          <span className="font-syne font-bold text-2xl text-cream">Forecour</span>
          <span className="font-syne font-bold text-2xl text-blue">IQ</span>
        </div>
        <h2 className="font-syne font-bold text-2xl text-cream">Sign in</h2>
        <p className="font-inter text-sm text-silver mt-1">ForecourIQ DMS</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="font-inter text-[13px] text-silver">Email Address</label>
          <Input 
            {...register('email')} 
            type="email" 
            placeholder="name@dealership.co.uk"
            className="bg-carbon border-steel focus:border-blue text-cream"
          />
          {errors.email && <p className="text-negative text-xs mt-1">{errors.email.message as string}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="font-inter text-[13px] text-silver">Password</label>
            <Link href="/reset-password" id="forgot-password" className="text-pewter hover:text-cream text-xs transition-colors">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input 
              {...register('password')} 
              type={showPassword ? 'text' : 'password'} 
              className="bg-carbon border-steel focus:border-blue text-cream pr-10"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-pewter hover:text-silver"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-negative text-xs mt-1">{errors.password.message as string}</p>}
        </div>

        <Button 
          type="submit" 
          variant="outline" 
          className="w-full h-12 border-blue text-blue hover:bg-blue hover:text-void font-syne font-bold text-[13px] tracking-[0.08em]"
          disabled={isLoading}
        >
          {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
        </Button>
      </form>

      {/* Demo Access Box */}
      <div className="bg-asphalt border border-steel p-4 rounded-[2px] space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] text-pewter uppercase tracking-widest">DEMO ACCESS</span>
          <button onClick={fillDemo} className="text-blue hover:text-cream font-mono text-[10px] uppercase tracking-wider transition-colors">USE DEMO</button>
        </div>
        <div className="font-mono text-[11px] text-silver space-y-1">
          <p>demo@forecouriq.co.uk</p>
          <p>ForecourtIQ2026!</p>
        </div>
      </div>

      <div className="text-center">
        <p className="font-inter text-sm text-pewter">
          Don't have an account?{' '}
          <a 
            href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/signup`} 
            className="text-blue hover:underline"
          >
            Start Free Trial
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-void flex flex-col md:flex-row overflow-hidden">
      
      {/* Left Panel - Brand */}
      <div className="hidden md:flex md:w-1/2 bg-carbon border-r border-steel flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="font-syne font-bold text-[28px] text-cream tracking-tight">Forecour</span>
          <span className="font-syne font-bold text-[28px] text-blue tracking-tight">IQ</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-syne italic font-semibold text-5xl text-cream leading-[1.1] tracking-tight">
            The platform for dealers who compete on <span className="text-blue">intelligence.</span>
          </h1>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center px-4 py-2 bg-void border border-steel rounded-[2px]">
            <span className="font-mono text-[11px] text-pewter uppercase tracking-widest">HARTWELL MOTOR GROUP · CHESTERFIELD</span>
          </div>
          <div className="flex gap-3">
            <div className="inline-flex items-center px-4 py-2 bg-void border border-steel rounded-[2px]">
              <span className="font-mono text-[11px] text-pewter uppercase tracking-widest">35 VEHICLES IN STOCK</span>
            </div>
            <div className="inline-flex items-center px-4 py-2 bg-void border border-steel rounded-[2px]">
              <span className="font-mono text-[11px] text-pewter uppercase tracking-widest">8 BUYING SIGNALS ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form wrapped in Suspense */}
      <div className="flex-1 flex items-center justify-center p-8 bg-void">
        <Suspense fallback={<div className="text-silver font-mono text-xs uppercase tracking-widest">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>

    </div>
  )
}
