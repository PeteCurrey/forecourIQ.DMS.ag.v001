import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RecommendationService } from '@/lib/services/iq/recommendation-service';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const result = await RecommendationService.dismiss(profile.dealership_id, user.id, id, body.reason);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
