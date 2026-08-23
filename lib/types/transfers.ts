// ==============================================================================
// FORECOURTIQ DMS — PHASE 09R TYPE CONTRACTS: MULTI-SITE STOCK TRANSFERS
// ==============================================================================

export type StockTransferStatus = 
  | 'requested' 
  | 'approved' 
  | 'scheduled' 
  | 'in_transit' 
  | 'received' 
  | 'rejected' 
  | 'cancelled';

export interface StockTransfer {
  id: string;
  dealership_id: string;
  vehicle_id: string;
  transfer_reference: string;
  origin_location_id: string;
  destination_location_id: string;
  status: StockTransferStatus;
  requested_by?: string | null;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  scheduled_dispatch_at?: string | null;
  expected_arrival_at?: string | null;
  dispatched_by?: string | null;
  dispatched_at?: string | null;
  received_by?: string | null;
  received_at?: string | null;
  received_condition_notes?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  transfer_reason?: string | null;
  transport_method: string;
  transport_cost: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    registration: string;
    make: string;
    model: string;
    variant?: string | null;
    asking_price?: number | null;
    purchase_price?: number | null;
    primary_image_url?: string | null;
  };
  origin_location?: {
    id: string;
    name: string;
    city?: string;
  };
  destination_location?: {
    id: string;
    name: string;
    city?: string;
  };
  requester?: {
    full_name?: string;
    email?: string;
  };
}

export interface StockTransferEvent {
  id: string;
  transfer_id: string;
  dealership_id: string;
  event_type: string;
  actor_user_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface VehicleLocationHistory {
  id: string;
  dealership_id: string;
  vehicle_id: string;
  from_location_id?: string | null;
  to_location_id: string;
  transfer_id?: string | null;
  changed_by?: string | null;
  changed_at: string;
  notes?: string | null;
  created_at: string;
  from_location?: { name: string };
  to_location?: { name: string };
  changed_by_profile?: { full_name: string };
}

export interface StockMovementsSummary {
  inboundCount: number;
  outboundCount: number;
  activeTransfers: Array<{
    id: string;
    reference: string;
    vehicleName: string;
    registration: string;
    imageUrl?: string | null;
    originName: string;
    destinationName: string;
    status: StockTransferStatus;
    eta?: string | null;
    isOverdue: boolean;
  }>;
}
