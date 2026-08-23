import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ChatService } from '@/lib/services/chat/chat-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const threads = await ChatService.listThreads(profile.dealership_id, user.id);
  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json();
  const { type, entityType, entityId, name, targetUserId } = body;

  try {
    let thread;
    if (type === 'entity' && entityType && entityId) {
      thread = await ChatService.getOrCreateEntityThread(
        profile.dealership_id,
        entityType,
        entityId,
        name || 'Discussion',
        user.id
      );
    } else if (type === 'direct' && targetUserId) {
      thread = await ChatService.getOrCreateDirectThread(
        profile.dealership_id,
        user.id,
        targetUserId
      );
    } else {
      return NextResponse.json({ error: 'Invalid thread creation payload' }, { status: 400 });
    }

    return NextResponse.json({ thread }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
