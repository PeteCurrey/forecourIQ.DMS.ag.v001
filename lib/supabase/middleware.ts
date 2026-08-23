import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Protected routes: /(dashboard)
  const isDashboardRoute = url.pathname.startsWith('/dashboard') || 
                          url.pathname.startsWith('/stock') || 
                          url.pathname.startsWith('/leads') || 
                          url.pathname.startsWith('/deals') ||
                          url.pathname.startsWith('/inbox') ||
                          url.pathname.startsWith('/tasks') ||
                          url.pathname.startsWith('/appointments') ||
                          url.pathname.startsWith('/advertising') ||
                          url.pathname.startsWith('/website') ||
                          url.pathname.startsWith('/command-centre') || 
                          url.pathname.startsWith('/analytics') || 
                          url.pathname.startsWith('/settings') || 
                          url.pathname.startsWith('/onboarding')

  // Auth routes
  const isAuthRoute = url.pathname.startsWith('/login') || 
                      url.pathname.startsWith('/signup') || 
                      url.pathname.startsWith('/callback')

  if (!user && isDashboardRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Onboarding check
  if (user && isDashboardRoute && !url.pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    const { data: dealership } = await supabase
      .from('dealerships')
      .select('city')
      .eq('id', profile.dealership_id)
      .single()

    if (!dealership?.city) {
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
