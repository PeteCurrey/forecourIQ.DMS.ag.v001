'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useVehicles(status?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['vehicles', status],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('*')
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
