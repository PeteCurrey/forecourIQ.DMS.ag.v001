import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ImportService } from '@/lib/services/import/import-service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('dealership_id, role').eq('id', user.id).single();
  if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 });

  const body = await req.json();
  const { fileName, mapping, rows, dryRun } = body;

  if (!rows || !Array.isArray(rows) || !mapping) {
    return NextResponse.json({ error: 'Invalid payload: rows and mapping required' }, { status: 400 });
  }

  const validation = ImportService.validateCustomerCSV(rows, mapping);

  if (dryRun) {
    return NextResponse.json({ validation });
  }

  if (validation.validRows.length === 0) {
    return NextResponse.json({ error: 'No valid rows to import', validation }, { status: 422 });
  }

  try {
    const job = await ImportService.executeImportJob(
      profile.dealership_id,
      'customers',
      fileName || 'customers_import.csv',
      validation.validRows,
      mapping,
      validation.errors,
      user.id
    );

    return NextResponse.json({ job, validation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
