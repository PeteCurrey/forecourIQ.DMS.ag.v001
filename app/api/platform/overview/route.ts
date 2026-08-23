import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlatformService } from '@/lib/services/platform/platform-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const operator = await PlatformService.verifyPlatformOperator(user.id);
  if (!operator) return NextResponse.json({ error: 'Platform operator access required' }, { status: 403 });

  const [metrics, dealerships] = await Promise.all([
    PlatformService.getGlobalMetrics(),
    PlatformService.listDealerships(),
  ]);

  return NextResponse.json({ metrics, dealerships, operator });
}
