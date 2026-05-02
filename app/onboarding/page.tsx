import OnboardingWizard from '@/components/onboarding/onboarding-wizard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export const metadata = {
  title: 'Onboarding | ForecourIQ DMS',
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile exists
  let { data: profile } = await supabase
    .from('profiles')
    .select('*, dealership:dealerships(*)')
    .eq('id', user.id)
    .single()

  // If no profile, create one immediately
  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({ id: user.id })
      .select('*, dealership:dealerships(*)')
      .single()
    
    if (createError) {
      return (
        <div className="min-h-screen bg-void flex items-center justify-center p-12">
          <div className="text-center">
            <h1 className="font-syne font-bold text-2xl text-cream mb-4">Account sync failed</h1>
            <p className="text-silver">{createError.message}</p>
          </div>
        </div>
      )
    }
    profile = newProfile
  }

  // If onboarding is already complete, redirect to dashboard
  if (profile.dealership?.city) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-void">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-silver font-mono text-xs uppercase tracking-widest">Initialising Wizard...</div>}>
        <OnboardingWizard profile={profile} dealership={profile.dealership} />
      </Suspense>
    </main>
  )
}
