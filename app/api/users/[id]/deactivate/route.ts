import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService } from '@/lib/services/user/user-service';

export async function GET(
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

  try {
    const workload = await UserService.getWorkloadSummary(profile.dealership_id, id);
    return NextResponse.json({ workload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

  if (!['admin', 'dealer_principal'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only administrators can deactivate users' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { reassignToUserId } = body;

  try {
    const result = await UserService.deactivateUser(
      profile.dealership_id,
      id,
      user.id,
      reassignToUserId
    );

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
