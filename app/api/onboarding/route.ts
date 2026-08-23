import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OnboardingService } from '@/lib/services/onboarding/onboarding-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single();

  if (!profile?.dealership_id) {
    return NextResponse.json({ error: 'No dealership associated' }, { status: 403 });
  }

  const state = await OnboardingService.getOnboardingState(profile.dealership_id);
  return NextResponse.json({ state });
}
