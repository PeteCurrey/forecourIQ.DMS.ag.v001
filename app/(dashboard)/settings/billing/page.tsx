import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BillingService } from '@/lib/services/billing/billing-service';
import BillingClient from './billing-client';

export const metadata = { title: 'Billing & Plan — ForecourIQ DMS' };

export default async function BillingSettingsPage() {
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

  const [billing, stockEntitlement, userEntitlement] = await Promise.all([
    BillingService.getSubscription(profile.dealership_id),
    BillingService.checkStockEntitlement(profile.dealership_id),
    BillingService.checkUserEntitlement(profile.dealership_id),
  ]);

  return (
    <div className="px-6 py-8">
      <BillingClient
        subscription={billing.subscription}
        plan={billing.plan}
        status={billing.status}
        stockEntitlement={stockEntitlement}
        userEntitlement={userEntitlement}
      />
    </div>
  );
}
