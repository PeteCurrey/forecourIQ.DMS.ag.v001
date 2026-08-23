import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService } from '@/lib/services/user/user-service';
import { BillingService } from '@/lib/services/billing/billing-service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id, role').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  if (!['admin', 'dealer_principal'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only administrators can invite users' }, { status: 403 });
  }

  // Check plan entitlement limits
  const entitlement = await BillingService.checkUserEntitlement(profile.dealership_id);
  if (!entitlement.allowed) {
    return NextResponse.json({ error: entitlement.reason }, { status: 403 });
  }

  const body = await req.json();
  const { email, fullName, role, locationId } = body;

  if (!email || !fullName || !role) {
    return NextResponse.json({ error: 'email, fullName, and role are required' }, { status: 400 });
  }

  try {
    const invitation = await UserService.createInvitation(
      profile.dealership_id,
      email,
      fullName,
      role,
      user.id,
      locationId
    );

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
