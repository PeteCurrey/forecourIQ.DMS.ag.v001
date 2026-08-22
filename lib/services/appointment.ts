import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { NotFoundError, ValidationError } from '@/lib/errors'

export type AppointmentType =
  | 'test_drive'
  | 'sales_appointment'
  | 'vehicle_viewing'
  | 'collection'
  | 'handover'
  | 'call'
  | 'other'

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export interface AppointmentRecord {
  id: string
  dealership_id: string
  title: string
  appointment_type: AppointmentType
  status: AppointmentStatus
  customer_id?: string | null
  lead_id?: string | null
  vehicle_id?: string | null
  assigned_to?: string | null
  start_at: string
  end_at: string
  location?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  customers?: { id: string; first_name: string; last_name: string; phone?: string; email?: string } | null
  vehicles?: { id: string; registration: string; make: string; model: string } | null
  profiles?: { id: string; full_name: string } | null
}

export const AppointmentService = {
  async list(dealershipId: string, filters?: { date?: string; assignedTo?: string; status?: string }) {
    const supabase = await createClient()
    let query = supabase
      .from('appointments')
      .select('*, customers(id, first_name, last_name, phone, email), vehicles(id, registration, make, model), profiles:assigned_to(id, full_name)')
      .eq('dealership_id', dealershipId)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }
    if (filters?.date) {
      const start = `${filters.date}T00:00:00Z`
      const end = `${filters.date}T23:59:59Z`
      query = query.gte('start_at', start).lte('start_at', end)
    }

    const { data, error } = await query.order('start_at', { ascending: true })
    if (error) throw error
    return data as AppointmentRecord[]
  },

  async create(dealershipId: string, userId: string, payload: Partial<AppointmentRecord>) {
    if (!payload.title || !payload.start_at || !payload.end_at) {
      throw new ValidationError('Title, start time, and end time are required.')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...payload,
        dealership_id: dealershipId,
        status: payload.status || 'scheduled',
        appointment_type: payload.appointment_type || 'vehicle_viewing',
      })
      .select()
      .single()

    if (error) throw error

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'appointment.created' as any,
      entity_type: 'appointment',
      entity_id: data.id,
      after: data,
    })

    return data as AppointmentRecord
  },

  async updateStatus(dealershipId: string, userId: string, appointmentId: string, status: AppointmentStatus) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('id', appointmentId)
      .select()
      .single()

    if (error || !data) throw new NotFoundError('Appointment')

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: (status === 'cancelled' ? 'appointment.cancelled' : 'appointment.created') as any,
      entity_type: 'appointment',
      entity_id: appointmentId,
      after: { status },
    })

    return data as AppointmentRecord
  }
}
