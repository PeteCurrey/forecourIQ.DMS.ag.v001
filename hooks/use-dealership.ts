'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useDealership() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dealership'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, dealership:dealerships(*)')
        .eq('id', user.id)
        .single()

      return profile?.dealership
    }
  })
}
