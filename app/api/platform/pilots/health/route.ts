import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlatformService } from '@/lib/services/platform/platform-service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const operator = await PlatformService.verifyPlatformOperator(user.id);
  if (!operator) return NextResponse.json({ error: 'Forbidden: Platform Operator only' }, { status: 403 });

  const pilotHealth = await PlatformService.getPilotHealthList();
  return NextResponse.json({ pilotHealth });
}
