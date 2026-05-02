import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const demoEmail = 'demo@forecouriq.co.uk'
    const demoPassword = 'ForecourtIQ2026!'
    const hartwellId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    let demoUser: any = users.find(u => u.email === demoEmail)

    if (!demoUser) {
      // 2. Create demo user
      const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Demo User' }
      })
      if (createError) throw createError
      demoUser = user
    }

    if (!demoUser) throw new Error('Failed to identify demo user')

    // 3. Ensure profile exists and points to Hartwell
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', demoUser.id)
      .single()

    if (!profile) {
      await supabaseAdmin.from('profiles').insert({
        id: demoUser.id,
        dealership_id: hartwellId,
        full_name: 'Demo User',
        role: 'admin'
      })
    } else if (profile.dealership_id !== hartwellId) {
      await supabaseAdmin.from('profiles').update({
        dealership_id: hartwellId
      }).eq('id', demoUser.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Demo Provisioning Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
