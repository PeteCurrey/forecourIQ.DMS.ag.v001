import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BillingService } from '@/lib/services/billing/billing-service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id, role').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });
  if (!['admin', 'dealer_principal'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only Dealer Principals and Admins can access billing portal' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const returnUrl = body.returnUrl;

  try {
    const { url } = await BillingService.createCustomerPortalSession(profile.dealership_id, returnUrl);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
