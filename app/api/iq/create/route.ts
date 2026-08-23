import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreationService } from '@/lib/services/iq/creation-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    const body = await req.json();

    if (body.type === 'customer_reply') {
      if (!body.lead_id) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
      const result = await CreationService.draftCustomerReply({
        dealershipId: profile.dealership_id,
        userId: user.id,
        leadId: body.lead_id,
        tone: body.tone,
      });
      return NextResponse.json({ data: result });
    } else if (body.type === 'vehicle_description') {
      if (!body.vehicle_id) return NextResponse.json({ error: 'vehicle_id is required' }, { status: 400 });
      const result = await CreationService.draftVehicleDescription({
        dealershipId: profile.dealership_id,
        userId: user.id,
        vehicleId: body.vehicle_id,
        keyFeatures: body.key_features,
      });
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
