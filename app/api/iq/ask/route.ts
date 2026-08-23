import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AskService } from '@/lib/services/iq/ask-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'No active dealership' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.question || typeof body.question !== 'string') {
      return NextResponse.json({ error: 'question string is required' }, { status: 400 });
    }

    const result = await AskService.ask(profile.dealership_id, user.id, profile.role || 'sales', {
      question: body.question,
      conversation_id: body.conversation_id,
      context_entity: body.context_entity,
    });

    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
