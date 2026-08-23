import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TransferService } from '@/lib/services/transfers/transfer-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id, role').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { reason } = body;

  try {
    const transfer = await TransferService.cancelTransfer(
      profile.dealership_id,
      id,
      user.id,
      reason || 'Cancelled by dealership user'
    );
    return NextResponse.json({ transfer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
