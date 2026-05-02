import { createClient } from '@supabase/supabase-js'

// This client uses the service role key and should ONLY be used in server-side code (API routes, Server Actions)
// It bypasses Row Level Security (RLS)
// Use placeholders during build time to avoid crashing
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)
