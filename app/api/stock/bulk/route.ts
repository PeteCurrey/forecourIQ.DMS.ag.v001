import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VehicleService } from '@/lib/services/vehicle';
import { bulkStatusChangeSchema, bulkPriceAdjustmentSchema } from '@/lib/schemas/vehicle-schema';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single();

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'No dealership found' }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action;

    if (action === 'status_change') {
      const parsed = bulkStatusChangeSchema.parse(body);
      const result = await VehicleService.bulkUpdateStatus(
        profile.dealership_id,
        parsed.vehicleIds,
        parsed.newStatus,
        user.id,
        parsed.reason
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'price_adjust') {
      const parsed = bulkPriceAdjustmentSchema.parse(body);
      const result = await VehicleService.bulkUpdatePrice(
        profile.dealership_id,
        parsed.vehicleIds,
        parsed.adjustmentType,
        parsed.amount,
        user.id
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
  } catch (err: any) {
    console.error('[API stock/bulk] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
