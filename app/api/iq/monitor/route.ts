import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MonitoringService } from '@/lib/services/iq/monitoring-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    const result = await MonitoringService.evaluateConditions(profile.dealership_id);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
