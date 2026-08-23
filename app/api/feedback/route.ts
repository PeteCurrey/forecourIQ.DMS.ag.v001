import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FeedbackService } from '@/lib/services/feedback/feedback-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const { data: feedback } = await supabase
    .from('dealer_feedback')
    .select('*')
    .eq('dealership_id', profile.dealership_id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ feedback: feedback || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id, role').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { category, title, description, route, appVersion, browserInfo, screenshotUrl } = body;

  if (!category || !title || !description) {
    return NextResponse.json({ error: 'category, title, and description are required' }, { status: 400 });
  }

  try {
    const feedback = await FeedbackService.submitFeedback(
      profile.dealership_id,
      {
        category,
        title,
        description,
        route,
        appVersion: appVersion || '1.0.0-rc.1',
        userRole: profile.role,
        browserInfo,
        screenshotUrl,
      },
      user.id
    );

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
