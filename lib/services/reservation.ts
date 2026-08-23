import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'

export interface ReservationRecord {
  id: string
  dealership_id: string
  deal_id: string
  vehicle_id: string
  customer_id?: string | null
  salesperson_id?: string | null
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'converted_to_sale'
  deposit_amount: number
  expires_at?: string | null
  notes?: string | null
  created_by?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  cancelled_by?: string | null
  created_at: string
  updated_at: string
}

export const ReservationService = {
  async getByDeal(dealershipId: string, dealId: string): Promise<ReservationRecord | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('deal_id', dealId)
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (error) throw new Error(`ReservationService.getByDeal: ${error.message}`)
    return (data as ReservationRecord | null)
  },

  /**
   * Create a reservation for a vehicle.
   * DB unique partial index prevents two active reservations on the same vehicle.
   */
  async create(
    dealershipId: string,
    dealId: string,
    vehicleId: string,
    userId: string,
    opts: { deposit_amount?: number; expires_days?: number; notes?: string } = {}
  ): Promise<ReservationRecord> {
    const supabase = await createClient()

    // Verify vehicle belongs to dealership and is available/advertised
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, status')
      .eq('dealership_id', dealershipId)
      .eq('id', vehicleId)
      .single()

    if (!vehicle) throw new Error('Vehicle not found')
    if (!['available', 'advertised', 'ready_for_sale'].includes(vehicle.status)) {
      throw new Error(`Vehicle status '${vehicle.status}' cannot be reserved`)
    }

    // Get customer_id from deal
    const { data: deal } = await supabase
      .from('deals')
      .select('customer_id, salesperson_id')
      .eq('id', dealId)
      .single()

    const expiresAt = opts.expires_days
      ? new Date(Date.now() + opts.expires_days * 86400000).toISOString()
      : null

    // This INSERT will fail with a unique constraint violation if vehicle already has active reservation
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        dealership_id: dealershipId,
        deal_id: dealId,
        vehicle_id: vehicleId,
        customer_id: deal?.customer_id || null,
        salesperson_id: deal?.salesperson_id || null,
        status: 'active',
        deposit_amount: Number(opts.deposit_amount || 0),
        expires_at: expiresAt,
        notes: opts.notes || null,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Vehicle already has an active reservation. Only one reservation per vehicle is permitted.')
      }
      throw new Error(`ReservationService.create: ${error.message}`)
    }

    // Mark vehicle as reserved
    await supabase.from('vehicles').update({
      status: 'reserved',
      updated_at: new Date().toISOString(),
    }).eq('id', vehicleId)

    // Update deal status
    await supabase.from('deals').update({
      status: 'reserved',
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }).eq('id', dealId)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'reservation.created',
      entity_type: 'reservation',
      entity_id: data.id,
      after: { deal_id: dealId, vehicle_id: vehicleId },
      source: 'web',
    })

    return data as ReservationRecord
  },

  async cancel(
    dealershipId: string,
    reservationId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: res } = await supabase
      .from('reservations')
      .select('vehicle_id, deal_id, status')
      .eq('dealership_id', dealershipId)
      .eq('id', reservationId)
      .single()

    if (!res) throw new Error('Reservation not found')
    if (!['pending', 'active'].includes(res.status)) throw new Error('Reservation cannot be cancelled')

    await supabase.from('reservations').update({
      status: 'cancelled',
      cancelled_at: now,
      cancellation_reason: reason,
      cancelled_by: userId,
    }).eq('id', reservationId)

    // Return vehicle to available
    await supabase.from('vehicles').update({ status: 'available', updated_at: now }).eq('id', res.vehicle_id)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'reservation.cancelled',
      entity_type: 'reservation',
      entity_id: reservationId,
      after: { reason },
      source: 'web',
    })
  },
}
