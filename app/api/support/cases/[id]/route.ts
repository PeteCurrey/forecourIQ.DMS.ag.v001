import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupportService } from '@/lib/services/support/support-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { supportCase, messages } = await SupportService.getCaseWithMessages(id, false);
    return NextResponse.json({ supportCase, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { message, status, resolutionNotes } = body;

  try {
    if (message) {
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single();
      await SupportService.addMessage(id, 'customer', user.id, profile?.full_name || 'User', message);
    }
    if (status) {
      await SupportService.updateCaseStatus(id, status, resolutionNotes);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
