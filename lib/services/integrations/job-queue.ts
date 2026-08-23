import { createClient } from '@/lib/supabase/server'
import { AdvertisingService } from './advertising'
import { AccountingService } from './accounting'
import { IntegrationService } from './integration-service'

export interface FeedJobPayload {
  dealership_id: string
  vehicle_id: string
  provider_id: string
  job_type: 'publish' | 'update' | 'withdraw' | 'sync'
  payload?: Record<string, unknown>
}

export const IntegrationJobQueue = {
  /**
   * Enqueue a background integration job.
   */
  async enqueueJob(job: FeedJobPayload): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('portal_feed_jobs')
      .insert({
        dealership_id: job.dealership_id,
        vehicle_id: job.vehicle_id,
        provider_id: job.provider_id,
        job_type: job.job_type,
        status: 'queued',
        payload: job.payload || {},
      })
      .select('id')
      .single()

    if (error) throw new Error(`IntegrationJobQueue.enqueueJob: ${error.message}`)
    return data.id
  },

  /**
   * Process pending queued jobs for a dealership.
   */
  async processPendingJobs(dealershipId: string): Promise<{ processed: number; failed: number }> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: jobs } = await supabase
      .from('portal_feed_jobs')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('status', 'queued')
      .lte('next_attempt_at', now)
      .limit(10)

    let processed = 0
    let failed = 0

    for (const job of jobs || []) {
      try {
        await supabase
          .from('portal_feed_jobs')
          .update({ status: 'running', attempt_count: (job.attempt_count || 0) + 1 })
          .eq('id', job.id)

        if (job.job_type === 'publish') {
          await AdvertisingService.publish(dealershipId, job.vehicle_id, job.provider_id, 'system_job')
        } else if (job.job_type === 'withdraw') {
          await AdvertisingService.withdraw(dealershipId, job.vehicle_id, job.provider_id, 'system_job')
        }

        await supabase
          .from('portal_feed_jobs')
          .update({ status: 'success', completed_at: new Date().toISOString() })
          .eq('id', job.id)

        processed++
      } catch (err: any) {
        failed++
        const attempt = (job.attempt_count || 0) + 1
        const isMaxed = attempt >= (job.max_attempts || 3)

        await supabase
          .from('portal_feed_jobs')
          .update({
            status: isMaxed ? 'failed' : 'queued',
            last_error: err.message || 'Job execution failed',
            next_attempt_at: new Date(Date.now() + Math.pow(2, attempt) * 60000).toISOString(),
          })
          .eq('id', job.id)
      }
    }

    return { processed, failed }
  },
}
