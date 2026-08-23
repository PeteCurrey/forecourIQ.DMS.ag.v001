import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingService } from '@/lib/services/onboarding/onboarding-service';
import OnboardingClient from './onboarding-client';

export const metadata = { title: 'Dealership Setup — ForecourIQ DMS' };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.dealership_id) redirect('/dashboard');
  if (!['admin', 'dealer_principal'].includes(profile.role)) redirect('/dashboard');

  const state = await OnboardingService.getOnboardingState(profile.dealership_id);

  return (
    <div className="px-6 py-8">
      <OnboardingClient initialState={state} />
    </div>
  );
}
