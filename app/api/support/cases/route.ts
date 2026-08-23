import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupportService } from '@/lib/services/support/support-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const cases = await SupportService.listCases(profile.dealership_id);
  return NextResponse.json({ cases });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json();
  const { category, subject, description, priority } = body;

  if (!category || !subject || !description) {
    return NextResponse.json({ error: 'category, subject, and description are required' }, { status: 400 });
  }

  try {
    const supportCase = await SupportService.createCase(
      profile.dealership_id,
      user.id,
      category,
      subject,
      description,
      priority || 'normal'
    );
    return NextResponse.json({ supportCase }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
