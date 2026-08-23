import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlatformService } from '@/lib/services/platform/platform-service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const operator = await PlatformService.verifyPlatformOperator(user.id);
  if (!operator) return NextResponse.json({ error: 'Platform operator access required' }, { status: 403 });

  const body = await req.json();
  const { dealershipId, action, notes, reason } = body;

  if (!dealershipId || !action) {
    return NextResponse.json({ error: 'dealershipId and action are required' }, { status: 400 });
  }

  if (!['start', 'pause'].includes(action)) {
    return NextResponse.json({ error: 'action must be "start" or "pause"' }, { status: 400 });
  }

  try {
    let result;
    if (action === 'start') {
      result = await PlatformService.startPilot(dealershipId, operator.id, notes);
    } else {
      if (!reason) return NextResponse.json({ error: 'reason is required when pausing a pilot' }, { status: 400 });
      result = await PlatformService.pausePilot(dealershipId, operator.id, reason);
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
