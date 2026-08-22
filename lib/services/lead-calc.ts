/**
 * Pure calculation logic and type definitions for leads and CRM.
 * Safe to import in both Server and Client components.
 */

import { differenceInMinutes } from 'date-fns'

export type LeadStatus =
  | 'new'
  | 'unassigned'
  | 'contact_attempted'
  | 'contacted'
  | 'qualified'
  | 'appointment_booked'
  | 'appointment_completed'
  | 'proposal_required'
  | 'deal_ready'
  | 'nurture'
  | 'won'
  | 'lost'
  | 'closed'

export type LeadTemperature = 'hot' | 'warm' | 'cold' | 'unknown'
export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent'
export type LeadChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'web' | 'social' | 'walk_in' | 'internal'

export interface LeadRecord {
  id: string
  dealership_id: string
  location_id?: string | null
  vehicle_id?: string | null
  customer_id?: string | null
  source: string
  source_reference?: string | null
  channel: LeadChannel
  status: LeadStatus
  priority: LeadPriority
  temperature: LeadTemperature
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  subject?: string | null
  message?: string | null
  notes?: string | null
  finance_interest?: boolean
  part_ex_reg?: string | null
  part_ex_mileage?: number | null
  part_ex_value?: number | null
  assigned_to?: string | null
  received_at: string
  first_response_at?: string | null
  last_activity_at?: string | null
  next_action_at?: string | null
  next_action_description?: string | null
  won_at?: string | null
  lost_at?: string | null
  closed_at?: string | null
  close_reason?: string | null
  close_notes?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  vehicles?: {
    id: string
    make: string
    model: string
    registration: string
    year: number
    asking_price: number
    status: string
    photos?: string[] | null
  } | null
  customers?: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
    marketing_consent?: boolean
  } | null
  profiles?: {
    id: string
    full_name: string
    email?: string
  } | null
}

export interface LeadCRM_KPIs {
  newToday: number
  unassigned: number
  awaitingFirstResponse: number
  overdueFollowUps: number
  appointmentsBooked: number
  hotLeads: number
  qualified: number
  won: number
  lost: number
  avgFirstResponseMinutes: number
  leadToAppointmentRate: number
  leadToDealRate: number
}

/**
 * Calculate deterministic response SLA status for a lead.
 * Default target: 60 minutes for first response.
 */
export function calculateSLA(
  lead: { received_at?: string; first_response_at?: string | null; created_at: string },
  targetMinutes = 60
) {
  const received = new Date(lead.received_at || lead.created_at)
  
  if (lead.first_response_at) {
    const responded = new Date(lead.first_response_at)
    const minutesTaken = Math.max(0, differenceInMinutes(responded, received))
    return {
      status: 'responded' as const,
      minutesTaken,
      isWithinSLA: minutesTaken <= targetMinutes,
      label: `Responded in ${minutesTaken}m`,
    }
  }

  const elapsedMinutes = Math.max(0, differenceInMinutes(new Date(), received))
  const isOverdue = elapsedMinutes > targetMinutes
  const isDueSoon = elapsedMinutes > targetMinutes * 0.75 && !isOverdue

  return {
    status: isOverdue ? ('overdue' as const) : isDueSoon ? ('due_soon' as const) : ('on_time' as const),
    elapsedMinutes,
    isWithinSLA: !isOverdue,
    label: isOverdue ? `Overdue by ${elapsedMinutes - targetMinutes}m` : `${targetMinutes - elapsedMinutes}m remaining`,
  }
}
