import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BriefService } from '@/lib/services/iq/brief-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') as 'daily' | 'weekly') || 'daily';

    const brief = await BriefService.getTodayBriefing(profile.dealership_id, type);
    return NextResponse.json({ data: brief });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const type = body.type === 'weekly' ? 'weekly' : 'daily';

    const brief = await BriefService.generateBriefing(profile.dealership_id, type, user.id);
    return NextResponse.json({ data: brief, regenerated: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
