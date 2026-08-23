import { createClient } from '@/lib/supabase/server';
import { BriefService } from '@/lib/services/iq/brief-service';
import BriefClient from './brief-client';

export const metadata = {
  title: 'Executive Briefings | ForecourIQ DMS',
};

export default async function BriefingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, full_name, dealerships(name)')
    .eq('id', user.id)
    .single();

  const dealershipId = profile?.dealership_id;
  if (!dealershipId) return null;

  const [dailyBrief, weeklyBrief, history] = await Promise.all([
    BriefService.getTodayBriefing(dealershipId, 'daily'),
    BriefService.getTodayBriefing(dealershipId, 'weekly'),
    BriefService.getHistory(dealershipId, 20),
  ]);

  return (
    <BriefClient
      dealershipName={(profile?.dealerships as any)?.name || 'Hartwell Motor Group'}
      userName={profile?.full_name || 'Dealer Principal'}
      dailyBrief={dailyBrief}
      weeklyBrief={weeklyBrief}
      history={history}
    />
  );
}
