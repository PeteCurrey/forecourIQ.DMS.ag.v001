'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [isPasswordResetSuccess, setIsPasswordResetSuccess] = useState(false)

  useEffect(() => {
    // Check if user is in an active recovery session (e.g. from magic recovery link)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && searchParams.get('type') === 'recovery')) {
        setIsRecoveryMode(true)
      }
    })

    // Also check current session
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true)
      }
    }
    checkSession()
  }, [supabase, searchParams])

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      })

      if (error) {
        toast.error(error.message)
      } else {
        setIsEmailSent(true)
        toast.success('Password reset instructions sent to your email.')
      }
    } catch {
      toast.error('Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        toast.error(error.message)
      } else {
        setIsPasswordResetSuccess(true)
        toast.success('Password updated successfully.')
      }
    } catch {
      toast.error('Failed to update password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[380px] space-y-7">
      {/* State A: Password Successfully Reset */}
      {isPasswordResetSuccess ? (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-syne font-bold text-2xl text-[#1C1F26]">Password updated</h2>
            <p className="font-inter text-[13px] text-[#5C6478]">
              Your account password has been changed securely.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full h-11 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[2px] font-inter font-medium text-[13px] transition-colors"
          >
            Sign in to ForecourIQ
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : isRecoveryMode ? (
        /* State B: In Recovery Session -> Set New Password */
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-syne font-bold text-2xl text-[#1C1F26]">Set new password</h2>
            <p className="font-inter text-[13px] text-[#5C6478]">Choose a secure password for your account</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-inter text-[12px] font-medium text-[#353D4C]">
                New password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-white border border-[#D5D1C8] h-10.5 px-3.5 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-inter text-[12px] font-medium text-[#353D4C]">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-white border border-[#D5D1C8] h-10.5 px-3.5 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[2px] font-inter font-medium text-[13px] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? 'Updating password...' : 'Save and continue'}
              {!isLoading && <ArrowRight size={14} />}
            </button>
          </form>
        </div>
      ) : isEmailSent ? (
        /* State C: Reset Email Sent */
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-blue/10 text-[#0EA5E9] flex items-center justify-center mx-auto">
            <Mail size={22} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-syne font-bold text-2xl text-[#1C1F26]">Check your email</h2>
            <p className="font-inter text-[13px] text-[#5C6478]">
              We have sent a secure recovery link to <span className="font-medium text-[#1C1F26]">{email}</span>.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 text-[12px] font-inter text-[#0EA5E9] hover:underline font-medium"
            >
              <ArrowLeft size={13} />
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        /* State D: Initial Request Reset Link Form */
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-syne font-bold text-2xl text-[#1C1F26] tracking-tight">Reset password</h2>
            <p className="font-inter text-[13px] text-[#5C6478]">
              Enter your email and we will send you a password recovery link.
            </p>
          </div>

          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-inter text-[12px] font-medium text-[#353D4C]">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@dealership.co.uk"
                className="w-full bg-white border border-[#D5D1C8] h-10.5 px-3.5 rounded-[2px] font-inter text-[13px] text-[#1C1F26] placeholder:text-[#9DA8B7] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[2px] font-inter font-medium text-[13px] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? 'Sending recovery link...' : 'Send recovery link'}
              {!isLoading && <ArrowRight size={14} />}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-[#E2DFC9]">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 font-inter text-[12px] text-[#5C6478] hover:text-[#1C1F26]"
            >
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-void flex flex-col md:flex-row overflow-hidden">

      {/* Left 50% — Dark Cinematic Automotive Image */}
      <div className="relative md:w-1/2 h-56 md:h-auto min-h-[220px] md:min-h-screen flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#07080B]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-85 scale-100"
          style={{ backgroundImage: 'url("/images/supercar-hero.png")' }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex items-center gap-1">
          <span className="font-syne font-bold text-2xl text-[#EDE8DC] tracking-tight">Forecour</span>
          <span className="font-syne font-bold text-2xl text-[#0EA5E9] tracking-tight">IQ</span>
        </div>

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
        <Suspense fallback={<div className="text-[#5C6478] font-inter text-xs">Loading password recovery...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>

    </div>
  )
}
