import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TransferService } from '@/lib/services/transfers/transfer-service';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('status') || 'all';

  const transfers = await TransferService.listTransfers(profile.dealership_id, filter as any);
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id, role').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json();
  const { vehicleId, originLocationId, destinationLocationId, transferReason, transportMethod, expectedArrivalAt } = body;

  if (!vehicleId || !originLocationId || !destinationLocationId) {
    return NextResponse.json({ error: 'vehicleId, originLocationId, and destinationLocationId are required' }, { status: 400 });
  }

  try {
    const transfer = await TransferService.requestTransfer(
      profile.dealership_id,
      vehicleId,
      originLocationId,
      destinationLocationId,
      user.id,
      transferReason,
      transportMethod || 'internal_driver',
      expectedArrivalAt
    );

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
