import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ActionService } from '@/lib/services/iq/action-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    const actions = await ActionService.getPendingActions(profile.dealership_id);
    return NextResponse.json({ data: actions });
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

    const body = await req.json();
    if (!body.action_type || !body.input_payload) {
      return NextResponse.json({ error: 'action_type and input_payload are required' }, { status: 400 });
    }

    const result = await ActionService.requestAction(profile.dealership_id, user.id, {
      actionType: body.action_type,
      entityType: body.entity_type,
      entityId: body.entity_id,
      inputPayload: body.input_payload,
      recommendationId: body.recommendation_id,
    });

    return NextResponse.json({ data: result.action, executed: result.executed, error: result.error });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
