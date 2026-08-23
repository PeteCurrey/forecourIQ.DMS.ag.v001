import { createClient } from '@/lib/supabase/server';
import { BriefService } from '@/lib/services/iq/brief-service';
import { RecommendationService } from '@/lib/services/iq/recommendation-service';
import { ActionService } from '@/lib/services/iq/action-service';
import { BuyingService } from '@/lib/services/intelligence/buying-service';
import { PricingService } from '@/lib/services/intelligence/pricing-service';
import CommandCentreClient from './command-centre-client';

export const metadata = {
  title: 'Command Centre | ForecourIQ DMS',
};

export default async function CommandCentrePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, full_name, role, dealerships(name)')
    .eq('id', user.id)
    .single();

  const dealershipId = profile?.dealership_id;
  if (!dealershipId) return null;

  const [
    todayBrief,
    recommendations,
    pendingActions,
    buyingSignals,
    pricingSignals,
  ] = await Promise.all([
    BriefService.getTodayBriefing(dealershipId, 'daily'),
    RecommendationService.scanAndGenerate(dealershipId),
    ActionService.getPendingActions(dealershipId),
    BuyingService.getBuyingSignals(dealershipId),
    PricingService.getPricingSignals(dealershipId),
  ]);

  return (
    <CommandCentreClient
      dealershipName={(profile?.dealerships as any)?.name || 'Hartwell Motor Group'}
      userName={profile?.full_name || 'Dealer Principal'}
      userRole={profile?.role || 'admin'}
      todayBrief={todayBrief}
      recommendations={recommendations}
      pendingActions={pendingActions}
      buyingSignals={buyingSignals}
      pricingSignals={pricingSignals}
    />
  );
}
