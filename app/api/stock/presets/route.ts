import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VehicleService } from '@/lib/services/vehicle';
import { savedFilterPresetSchema } from '@/lib/schemas/vehicle-schema';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single();

    if (!profile?.dealership_id) {
      return NextResponse.json({ presets: [] });
    }

    const presets = await VehicleService.getFilterPresets(profile.dealership_id, user.id);
    return NextResponse.json({ presets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single();

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'No dealership found' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = savedFilterPresetSchema.parse(body);

    const preset = await VehicleService.saveFilterPreset(
      profile.dealership_id,
      user.id,
      parsed.name,
      parsed.filters,
      parsed.is_default
    );

    return NextResponse.json({ success: true, preset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single();

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'No dealership found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Preset ID is required' }, { status: 400 });
    }

    await VehicleService.deleteFilterPreset(profile.dealership_id, user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
