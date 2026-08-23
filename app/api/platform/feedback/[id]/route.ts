import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlatformService } from '@/lib/services/platform/platform-service';
import { FeedbackService } from '@/lib/services/feedback/feedback-service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const operator = await PlatformService.verifyPlatformOperator(user.id);
  if (!operator) return NextResponse.json({ error: 'Forbidden: Platform Operator only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { status, operatorNotes, releaseTag } = body;

  try {
    const updated = await FeedbackService.updateFeedbackStatus(
      id,
      status,
      operatorNotes,
      releaseTag
    );
    return NextResponse.json({ feedback: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
