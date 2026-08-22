import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VehicleService } from '@/lib/services/vehicle'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('dealership_id').eq('id', user.id).single()
    if (!profile?.dealership_id) return NextResponse.json({ error: 'No dealership' }, { status: 403 })

    const { vehicles } = await VehicleService.list(profile.dealership_id, { limit: 1000 })
    const csvContent = VehicleService.exportToCSV(vehicles)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="forecourtiq_stock_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export CSV error:', err)
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 })
  }
}
