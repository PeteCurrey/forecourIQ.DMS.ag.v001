import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuditService } from '@/lib/services/audit';
import { DealershipIQSettings } from '@/lib/types/iq';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    let { data: settings } = await supabase
      .from('dealership_iq_settings')
      .select('*')
      .eq('dealership_id', profile.dealership_id)
      .maybeSingle();

    if (!settings) {
      // Create defaults
      const { data: newSettings } = await supabase
        .from('dealership_iq_settings')
        .insert({ dealership_id: profile.dealership_id })
        .select()
        .single();
      settings = newSettings;
    }

    return NextResponse.json({ data: settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('dealership_id, role').eq('id', user.id).single();
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

    if (profile.role !== 'admin' && profile.role !== 'dealer_principal' && profile.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: only managers or admins can update IQ settings' }, { status: 403 });
    }

    const body = await req.json();

    const { data: updated, error } = await supabase
      .from('dealership_iq_settings')
      .upsert({
        dealership_id: profile.dealership_id,
        ...body,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    if (body.automation_paused !== undefined) {
      await AuditService.log({
        dealership_id: profile.dealership_id,
        user_id: user.id,
        action: body.automation_paused ? 'iq.automation_paused' : 'iq.automation_enabled',
        entity_type: 'dealership_iq_settings',
        entity_id: profile.dealership_id,
      });
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
