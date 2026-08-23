'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { loginSchema } from '@/lib/validations'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
    }
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error('Invalid email or password.')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-[380px] space-y-7">
      <div className="space-y-1.5">
        <h2 className="font-syne font-bold text-2xl text-[#1C1F26] tracking-tight">Welcome back</h2>
        <p className="font-inter text-[13px] text-[#5C6478]">Sign in to your ForecourIQ dealership account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block font-inter text-[12px] font-medium text-[#353D4C]">
            Email address
          </label>
          <div className="relative">
            <input
              {...register('email')}
              type="email"
              placeholder="name@dealership.co.uk"
              className="w-full bg-white border border-[#D5D1C8] h-10.5 px-3.5 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
            />
          </div>
          {errors.email && <p className="text-rose-600 text-[11px] font-inter mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block font-inter text-[12px] font-medium text-[#353D4C]">
              Password
            </label>
            <Link 
              href="/reset-password" 
              className="text-[#0EA5E9] hover:text-[#0284C7] font-inter text-[12px] transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full bg-white border border-[#D5D1C8] h-10.5 pl-3.5 pr-10 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9DA8B7] hover:text-[#5C6478] p-1"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className="text-rose-600 text-[11px] font-inter mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#0EA5E9] hover:bg-[#0284C7] active:bg-[#0369A1] text-white rounded-[2px] font-inter font-medium text-[13px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2 cursor-pointer"
        >
          {isLoading ? 'Signing in...' : 'Sign in to DMS'}
          {!isLoading && <ArrowRight size={14} />}
        </button>
      </form>

      <div className="pt-2 text-center border-t border-[#E2DFC9]">
        <p className="font-inter text-[12px] text-[#5C6478]">
          New to ForecourIQ?{' '}
          <Link href="/signup" className="text-[#0EA5E9] hover:underline font-medium">
            Start 14-day free trial
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
        <Suspense fallback={<div className="text-[#5C6478] font-inter text-xs">Loading sign in...</div>}>
          <LoginForm />
        </Suspense>
      </div>

    </div>
  )
}
