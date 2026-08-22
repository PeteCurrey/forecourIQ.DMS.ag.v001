import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { NotFoundError, ValidationError } from '@/lib/errors'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export interface TaskRecord {
  id: string
  dealership_id: string
  title: string
  description?: string | null
  priority: TaskPriority
  status: TaskStatus
  entity_type?: 'vehicle' | 'customer' | 'lead' | 'deal' | 'dealership' | null
  entity_id?: string | null
  due_at?: string | null
  assigned_to?: string | null
  created_by?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  profiles?: { id: string; full_name: string } | null
}

export const TaskService = {
  async list(dealershipId: string, filters?: { status?: string; assignedTo?: string; entityType?: string; entityId?: string }) {
    const supabase = await createClient()
    let query = supabase
      .from('tasks')
      .select('*, profiles:assigned_to(id, full_name)')
      .eq('dealership_id', dealershipId)

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        query = query.in('status', ['open', 'in_progress'])
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }
    if (filters?.entityType && filters?.entityId) {
      query = query.eq('entity_type', filters.entityType).eq('entity_id', filters.entityId)
    }

    const { data, error } = await query.order('due_at', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data as TaskRecord[]
  },

  async create(dealershipId: string, userId: string, payload: Partial<TaskRecord>) {
    if (!payload.title) {
      throw new ValidationError('Task title is required.')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...payload,
        dealership_id: dealershipId,
        created_by: userId,
        status: payload.status || 'open',
        priority: payload.priority || 'normal',
      })
      .select()
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'task.created' as any,
      entity_type: 'task',
      entity_id: data.id,
      after: data,
    })

    return data as TaskRecord
  },

  async updateStatus(dealershipId: string, userId: string, taskId: string, newStatus: TaskStatus) {
    const supabase = await createClient()
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('dealership_id', dealershipId)
      .eq('id', taskId)
      .select()
      .single()

    if (error || !data) throw new NotFoundError('Task')

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: (newStatus === 'completed' ? 'task.completed' : 'task.created') as any,
      entity_type: 'task',
      entity_id: taskId,
      after: { status: newStatus },
    })

    return data as TaskRecord
  }
}
