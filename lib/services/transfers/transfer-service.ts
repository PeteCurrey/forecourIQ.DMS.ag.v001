import { createClient } from '@/lib/supabase/server';
import { 
  StockMovementsSummary, 
  StockTransfer, 
  StockTransferStatus, 
  VehicleLocationHistory 
} from '@/lib/types/transfers';

export class TransferService {
  /**
   * Generate human-readable transfer reference (e.g. TR-2026-00124).
   */
  static generateTransferReference(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `TR-${year}-${rand}`;
  }

  /**
   * Request a new stock transfer.
   */
  static async requestTransfer(
    dealershipId: string,
    vehicleId: string,
    originLocationId: string,
    destinationLocationId: string,
    requestedByUserId: string,
    transferReason?: string,
    transportMethod: string = 'internal_driver',
    expectedArrivalAt?: string
  ): Promise<StockTransfer> {
    const supabase = await createClient();

    if (originLocationId === destinationLocationId) {
      throw new Error('Destination location cannot be the same as the origin location.');
    }

    // 1. Conflict Check: check if vehicle is already in an active transfer
    const { data: activeTransfer } = await supabase
      .from('stock_transfers')
      .select('id, transfer_reference, status')
      .eq('vehicle_id', vehicleId)
      .in('status', ['requested', 'approved', 'scheduled', 'in_transit'])
      .maybeSingle();

    if (activeTransfer) {
      throw new Error(
        `Vehicle is already assigned to active transfer ${activeTransfer.transfer_reference} (${activeTransfer.status}).`
      );
    }

    // 2. Check if vehicle is completed or sold
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, status, make, model, registration')
      .eq('id', vehicleId)
      .single();

    if (!vehicle || ['sold', 'completed', 'archived'].includes(vehicle.status)) {
      throw new Error('Completed or sold vehicles cannot be placed on normal stock transfer.');
    }

    const reference = this.generateTransferReference();

    // 3. Create transfer record
    const { data: transfer, error } = await supabase
      .from('stock_transfers')
      .insert({
        dealership_id: dealershipId,
        vehicle_id: vehicleId,
        transfer_reference: reference,
        origin_location_id: originLocationId,
        destination_location_id: destinationLocationId,
        status: 'requested',
        requested_by: requestedByUserId,
        requested_at: new Date().toISOString(),
        transfer_reason: transferReason,
        transport_method: transportMethod,
        expected_arrival_at: expectedArrivalAt,
      })
      .select('*')
      .single();

    if (error || !transfer) {
      throw new Error(`Failed to create transfer request: ${error?.message}`);
    }

    // 4. Log transfer event
    await supabase.from('stock_transfer_events').insert({
      transfer_id: transfer.id,
      dealership_id: dealershipId,
      event_type: 'transfer_requested',
      actor_user_id: requestedByUserId,
      metadata: { originLocationId, destinationLocationId, transferReason },
    });

    return transfer as StockTransfer;
  }

  /**
   * Approve a requested stock transfer.
   */
  static async approveTransfer(
    dealershipId: string,
    transferId: string,
    approvedByUserId: string
  ): Promise<StockTransfer> {
    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('stock_transfers')
      .update({
        status: 'approved',
        approved_by: approvedByUserId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId)
      .eq('dealership_id', dealershipId)
      .eq('status', 'requested')
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to approve transfer: ${error?.message || 'Transfer is not in requested state'}`);
    }

    await supabase.from('stock_transfer_events').insert({
      transfer_id: transferId,
      dealership_id: dealershipId,
      event_type: 'transfer_approved',
      actor_user_id: approvedByUserId,
    });

    return updated as StockTransfer;
  }

  /**
   * Dispatch a vehicle on a transfer (transitions to in_transit).
   */
  static async dispatchTransfer(
    dealershipId: string,
    transferId: string,
    dispatchedByUserId: string,
    transportMethod?: string,
    expectedArrivalAt?: string
  ): Promise<StockTransfer> {
    const supabase = await createClient();

    const updates: Record<string, any> = {
      status: 'in_transit',
      dispatched_by: dispatchedByUserId,
      dispatched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (transportMethod) updates.transport_method = transportMethod;
    if (expectedArrivalAt) updates.expected_arrival_at = expectedArrivalAt;

    const { data: updated, error } = await supabase
      .from('stock_transfers')
      .update(updates)
      .eq('id', transferId)
      .eq('dealership_id', dealershipId)
      .in('status', ['requested', 'approved', 'scheduled'])
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to dispatch transfer: ${error?.message}`);
    }

    await supabase.from('stock_transfer_events').insert({
      transfer_id: transferId,
      dealership_id: dealershipId,
      event_type: 'transfer_dispatched',
      actor_user_id: dispatchedByUserId,
      metadata: { expectedArrivalAt },
    });

    return updated as StockTransfer;
  }

  /**
   * Confirm vehicle receipt at destination location.
   * CRITICAL INVARIANT: vehicles.location_id is ONLY updated upon receipt.
   */
  static async receiveTransfer(
    dealershipId: string,
    transferId: string,
    receivedByUserId: string,
    conditionNotes?: string
  ): Promise<{ transfer: StockTransfer; locationHistory: VehicleLocationHistory }> {
    const supabase = await createClient();

    // 1. Fetch current transfer
    const { data: transfer, error: fetchErr } = await supabase
      .from('stock_transfers')
      .select('*')
      .eq('id', transferId)
      .eq('dealership_id', dealershipId)
      .single();

    if (fetchErr || !transfer) {
      throw new Error('Transfer record not found.');
    }

    if (transfer.status === 'received') {
      throw new Error('Transfer has already been received.');
    }

    // 2. Atomically mark transfer received
    const { data: updatedTransfer, error: updateErr } = await supabase
      .from('stock_transfers')
      .update({
        status: 'received',
        received_by: receivedByUserId,
        received_at: new Date().toISOString(),
        received_condition_notes: conditionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId)
      .select('*')
      .single();

    if (updateErr || !updatedTransfer) {
      throw new Error(`Failed to receive transfer: ${updateErr?.message}`);
    }

    // 3. Atomically update vehicle physical location_id
    const { error: vehicleErr } = await supabase
      .from('vehicles')
      .update({
        location_id: transfer.destination_location_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transfer.vehicle_id)
      .eq('dealership_id', dealershipId);

    if (vehicleErr) {
      console.error('Error updating vehicle location_id:', vehicleErr);
    }

    // 4. Create permanent location history entry
    const { data: locationHistory, error: historyErr } = await supabase
      .from('vehicle_location_history')
      .insert({
        dealership_id: dealershipId,
        vehicle_id: transfer.vehicle_id,
        from_location_id: transfer.origin_location_id,
        to_location_id: transfer.destination_location_id,
        transfer_id: transfer.id,
        changed_by: receivedByUserId,
        notes: conditionNotes || 'Stock transfer received',
      })
      .select('*')
      .single();

    // 5. Log transfer event
    await supabase.from('stock_transfer_events').insert({
      transfer_id: transferId,
      dealership_id: dealershipId,
      event_type: 'transfer_received',
      actor_user_id: receivedByUserId,
      metadata: { conditionNotes, destinationLocationId: transfer.destination_location_id },
    });

    return {
      transfer: updatedTransfer as StockTransfer,
      locationHistory: locationHistory as VehicleLocationHistory,
    };
  }

  /**
   * Cancel an active stock transfer.
   */
  static async cancelTransfer(
    dealershipId: string,
    transferId: string,
    cancelledByUserId: string,
    reason: string
  ): Promise<StockTransfer> {
    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('stock_transfers')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledByUserId,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId)
      .eq('dealership_id', dealershipId)
      .not('status', 'in', '("received","cancelled","rejected")')
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to cancel transfer: ${error?.message || 'Transfer cannot be cancelled'}`);
    }

    await supabase.from('stock_transfer_events').insert({
      transfer_id: transferId,
      dealership_id: dealershipId,
      event_type: 'transfer_cancelled',
      actor_user_id: cancelledByUserId,
      metadata: { reason },
    });

    return updated as StockTransfer;
  }

  /**
   * List transfers with filters for UI.
   */
  static async listTransfers(
    dealershipId: string,
    filterStatus?: StockTransferStatus | 'active' | 'all'
  ): Promise<StockTransfer[]> {
    const supabase = await createClient();

    let query = supabase
      .from('stock_transfers')
      .select(`
        *,
        vehicle:vehicles(id, registration, make, model, variant, asking_price, purchase_price, vehicle_images(url, is_primary)),
        origin_location:dealership_locations!stock_transfers_origin_location_id_fkey(id, name, city),
        destination_location:dealership_locations!stock_transfers_destination_location_id_fkey(id, name, city),
        requester:profiles!stock_transfers_requested_by_fkey(full_name, email)
      `)
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false });

    if (filterStatus && filterStatus === 'active') {
      query = query.in('status', ['requested', 'approved', 'scheduled', 'in_transit']);
    } else if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((t: any) => {
      const v = t.vehicle;
      const primaryImg = v?.vehicle_images?.find((i: any) => i.is_primary)?.url || v?.vehicle_images?.[0]?.url || null;
      return {
        ...t,
        vehicle: v ? {
          ...v,
          primary_image_url: primaryImg,
        } : undefined,
      };
    }) as StockTransfer[];
  }

  /**
   * Fetch permanent location history for a specific vehicle.
   */
  static async getVehicleLocationHistory(
    dealershipId: string,
    vehicleId: string
  ): Promise<VehicleLocationHistory[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vehicle_location_history')
      .select(`
        *,
        from_location:dealership_locations!vehicle_location_history_from_location_id_fkey(name),
        to_location:dealership_locations!vehicle_location_history_to_location_id_fkey(name),
        changed_by_profile:profiles!vehicle_location_history_changed_by_fkey(full_name)
      `)
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .order('changed_at', { ascending: false });

    if (error || !data) return [];
    return data as VehicleLocationHistory[];
  }

  /**
   * Get active stock movements summary for multi-site dashboard widget.
   */
  static async getStockMovementsSummary(dealershipId: string): Promise<StockMovementsSummary> {
    const supabase = await createClient();

    const { data: transfers } = await supabase
      .from('stock_transfers')
      .select(`
        id,
        transfer_reference,
        status,
        expected_arrival_at,
        vehicles(id, make, model, registration, vehicle_images(url, is_primary)),
        origin_location:dealership_locations!stock_transfers_origin_location_id_fkey(name),
        destination_location:dealership_locations!stock_transfers_destination_location_id_fkey(name)
      `)
      .eq('dealership_id', dealershipId)
      .in('status', ['requested', 'approved', 'scheduled', 'in_transit'])
      .order('created_at', { ascending: false });

    const now = new Date();
    const activeList = (transfers || []).map((t: any) => {
      const v = t.vehicles;
      const primaryImg = v?.vehicle_images?.find((i: any) => i.is_primary)?.url || v?.vehicle_images?.[0]?.url || null;
      const isOverdue = t.status === 'in_transit' && t.expected_arrival_at && new Date(t.expected_arrival_at) < now;

      return {
        id: t.id,
        reference: t.transfer_reference,
        vehicleName: v ? `${v.make} ${v.model}` : 'Vehicle',
        registration: v?.registration || '—',
        imageUrl: primaryImg,
        originName: t.origin_location?.name || 'Origin Site',
        destinationName: t.destination_location?.name || 'Destination Site',
        status: t.status as StockTransferStatus,
        eta: t.expected_arrival_at,
        isOverdue: !!isOverdue,
      };
    });

    return {
      inboundCount: activeList.filter(t => t.status === 'in_transit').length,
      outboundCount: activeList.filter(t => ['requested', 'approved', 'scheduled'].includes(t.status)).length,
      activeTransfers: activeList.slice(0, 4),
    };
  }
}
