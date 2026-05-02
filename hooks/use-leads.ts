'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useLeads(status?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['leads', status],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*, vehicle:vehicles(make, model, registration)')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}
