import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BillingService } from '@/lib/services/billing/billing-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  try {
    const billing = await BillingService.getSubscription(profile.dealership_id);
    const stockEntitlement = await BillingService.checkStockEntitlement(profile.dealership_id);
    const userEntitlement = await BillingService.checkUserEntitlement(profile.dealership_id);

    return NextResponse.json({ billing, stockEntitlement, userEntitlement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
