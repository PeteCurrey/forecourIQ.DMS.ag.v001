import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GDPRService } from '@/lib/services/privacy/gdpr-service';

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

  const allowedRoles = ['admin', 'dealer_principal', 'compliance'];
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions for GDPR data export' }, { status: 403 });
  }

  try {
    const exportData = await GDPRService.exportCustomerData(profile.dealership_id, id);

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set(
      'Content-Disposition',
      `attachment; filename="gdpr-export-${id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`
    );

    return new NextResponse(JSON.stringify(exportData, null, 2), { headers, status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
