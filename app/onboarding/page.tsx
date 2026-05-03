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
      if (createError.message.includes('Could not find the table')) {
        return (
          <div className="min-h-screen bg-void flex flex-col items-center justify-center p-12 text-center">
            <h1 className="font-syne font-bold text-3xl text-negative mb-4">Database Not Initialized</h1>
            <div className="max-w-2xl text-silver space-y-6">
              <p className="text-lg">The application cannot find the required database tables.</p>
              <div className="bg-carbon border border-steel p-6 rounded text-left">
                <h2 className="font-syne font-bold text-cream mb-4">How to fix this:</h2>
                <ol className="list-decimal list-inside space-y-3">
                  <li>Go to your <strong>Supabase Dashboard</strong>.</li>
                  <li>Open the <strong>SQL Editor</strong>.</li>
                  <li>Copy and run the contents of <code>supabase/migrations/001_schema.sql</code></li>
                  <li>Copy and run the contents of <code>supabase/seed.sql</code></li>
                </ol>
              </div>
              <p className="text-sm text-pewter">Once completed, refresh this page.</p>
            </div>
          </div>
        )
      }
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
