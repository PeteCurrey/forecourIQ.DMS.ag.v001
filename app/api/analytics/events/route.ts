import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductAnalyticsService } from '@/lib/services/analytics/product-analytics-service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { eventName, category, properties } = body;

  if (!eventName || !category) {
    return NextResponse.json({ error: 'eventName and category are required' }, { status: 400 });
  }

  await ProductAnalyticsService.trackEvent(
    profile.dealership_id,
    eventName,
    category,
    properties || {},
    user.id
  );

  return NextResponse.json({ success: true }, { status: 201 });
}
