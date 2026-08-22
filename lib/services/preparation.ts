import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { NotFoundError, ValidationError } from '@/lib/errors'

export type PrepJobCategory =
  | 'mechanical'
  | 'service'
  | 'mot'
  | 'tyres'
  | 'alloy_wheel'
  | 'bodywork'
  | 'smart_repair'
  | 'valeting'
  | 'detailing'
  | 'photography'
  | 'other'

export type PrepJobStatus =
  | 'not_started'
  | 'scheduled'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'cancelled'

export interface PrepJobRecord {
  id: string
  dealership_id: string
  vehicle_id: string
  title: string
  category: PrepJobCategory
  supplier?: string | null
  job_type: 'internal' | 'external'
  status: PrepJobStatus
  estimated_cost: number
  actual_cost: number
  scheduled_date?: string | null
  due_date?: string | null
  completed_date?: string | null
  assigned_to?: string | null
  notes?: string | null
  blockers?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  vehicles?: {
    id: string
    registration: string
    make: string
    model: string
    status: string
    photos?: string[]
  } | null
  profiles?: {
    id: string
    full_name: string
  } | null
}

export const PreparationService = {
  /**
   * List all preparation jobs across the dealership with filters.
   */
  async list(dealershipId: string, filters?: { status?: string; vehicleId?: string; category?: string }) {
    const supabase = await createClient()
    let query = supabase
      .from('preparation_jobs')
      .select('*, vehicles(id, registration, make, model, status, photos), profiles:assigned_to(id, full_name)')
      .eq('dealership_id', dealershipId)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.vehicleId) {
      query = query.eq('vehicle_id', filters.vehicleId)
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data as PrepJobRecord[]
  },

  /**
   * Create a new preparation job and sync to vehicle prep cost if actual_cost > 0.
   */
  async create(dealershipId: string, userId: string, payload: Partial<PrepJobRecord>) {
    if (!payload.vehicle_id || !payload.title) {
      throw new ValidationError('Vehicle and job title are required.')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('preparation_jobs')
      .insert({
        ...payload,
        dealership_id: dealershipId,
        created_by: userId,
        status: payload.status || 'not_started',
        estimated_cost: payload.estimated_cost || 0,
        actual_cost: payload.actual_cost || 0,
      })
      .select()
      .single()

    if (error) throw error

    // Sync vehicle total prep costs
    await this.syncVehiclePrepCost(dealershipId, payload.vehicle_id)

    // Audit
    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'vehicle.updated',
      entity_type: 'preparation_job',
      entity_id: data.id,
      after: data,
    })

    return data as PrepJobRecord
  },

  /**
   * Update a preparation job, status, or actual cost with ledger integration.
   */
  async update(dealershipId: string, userId: string, jobId: string, updates: Partial<PrepJobRecord>) {
    const supabase = await createClient()

    if (updates.status === 'completed' && !updates.completed_date) {
      updates.completed_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('preparation_jobs')
      .update(updates)
      .eq('dealership_id', dealershipId)
      .eq('id', jobId)
      .select()
      .single()

    if (error) throw error

    // If actual cost was updated or completed, sync to vehicle cost ledger
    if (data.vehicle_id) {
      await this.syncVehiclePrepCost(dealershipId, data.vehicle_id)

      if (updates.actual_cost && updates.actual_cost > 0) {
        // Record in vehicle_costs table if not already added
        await supabase.from('vehicle_costs').insert({
          dealership_id: dealershipId,
          vehicle_id: data.vehicle_id,
          category: data.category || 'prep',
          description: `Prep Job: ${data.title}`,
          amount: updates.actual_cost,
          supplier_name: data.supplier || null,
          created_by: userId,
        })
      }
    }

    return data as PrepJobRecord
  },

  /**
   * Recalculate and update the vehicle's total prep_cost from all active jobs.
   */
  async syncVehiclePrepCost(dealershipId: string, vehicleId: string) {
    const supabase = await createClient()
    const { data: jobs } = await supabase
      .from('preparation_jobs')
      .select('actual_cost, estimated_cost, status')
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .neq('status', 'cancelled')

    const totalPrep = (jobs || []).reduce((sum, j) => {
      const cost = Number(j.actual_cost || 0) > 0 ? Number(j.actual_cost) : Number(j.estimated_cost || 0)
      return sum + cost
    }, 0)

    await supabase
      .from('vehicles')
      .update({ prep_cost: totalPrep })
      .eq('dealership_id', dealershipId)
      .eq('id', vehicleId)
  },

  /**
   * Delete preparation job.
   */
  async delete(dealershipId: string, _userId: string, jobId: string, vehicleId: string) {
    const supabase = await createClient()
    const { error } = await supabase
      .from('preparation_jobs')
      .delete()
      .eq('dealership_id', dealershipId)
      .eq('id', jobId)

    if (error) throw error
    await this.syncVehiclePrepCost(dealershipId, vehicleId)
  }
}
