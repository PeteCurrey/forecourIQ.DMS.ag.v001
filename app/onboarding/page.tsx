import OnboardingWizard from '@/components/onboarding/onboarding-wizard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, dealership:dealerships(*)')
    .eq('id', user.id)
    .single()

  // If no profile, they shouldn't be here (auth hook should have created it, but defensive)
  if (!profile) {
    // Attempt to fix state or log out
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-12">
        <div className="text-center">
          <h1 className="font-syne font-bold text-2xl text-cream mb-4">Account sync in progress...</h1>
          <p className="text-silver">Please refresh in a moment. If this persists, contact support.</p>
        </div>
      </div>
    )
  }

  // If onboarding is already complete, redirect to dashboard
  if (profile.dealership?.city) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-void">
      <OnboardingWizard profile={profile} dealership={profile.dealership} />
    </main>
  )
}
