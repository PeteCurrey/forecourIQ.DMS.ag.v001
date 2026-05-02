import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if onboarding is complete
        const { data: profile } = await supabase
          .from('profiles')
          .select('dealership_id')
          .eq('id', user.id)
          .single()
          
        if (profile?.dealership_id) {
          const { data: dealership } = await supabase
            .from('dealerships')
            .select('city')
            .eq('id', profile.dealership_id)
            .single()
            
          if (dealership?.city) {
            return NextResponse.redirect(`${origin}/dashboard`)
          }
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
