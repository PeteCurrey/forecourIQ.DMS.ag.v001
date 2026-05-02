'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useRealtimeLeads(dealershipId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!dealershipId) return

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `dealership_id=eq.${dealershipId}`,
        },
        (payload) => {
          // Invalidate leads query
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          
          // Show toast
          toast.info(`New Lead: ${payload.new.first_name} ${payload.new.last_name}`, {
            description: `Source: ${payload.new.source}`,
            action: {
              label: 'View',
              onClick: () => window.location.href = `/leads/${payload.new.id}`
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dealershipId, queryClient, supabase])
}
