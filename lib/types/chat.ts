// ==============================================================================
// FORECOURTIQ DMS — PHASE 09R TYPE CONTRACTS: INTERNAL TEAM CHAT
// ==============================================================================

export type InternalThreadType = 'direct' | 'channel' | 'entity';
export type InternalEntityType = 'vehicle' | 'lead' | 'deal' | 'customer' | 'stock_transfer';

export interface InternalThreadMember {
  id: string;
  thread_id: string;
  user_id: string;
  dealership_id: string;
  role: 'owner' | 'admin' | 'member';
  last_read_at?: string | null;
  joined_at: string;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    role?: string;
  };
}

export interface InternalMessageAttachment {
  id: string;
  message_id: string;
  dealership_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes?: number | null;
  created_at: string;
}

export interface InternalMessage {
  id: string;
  dealership_id: string;
  thread_id: string;
  sender_user_id?: string | null;
  body: string;
  reply_to_message_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
    role?: string;
  };
  attachments?: InternalMessageAttachment[];
}

export interface InternalThread {
  id: string;
  dealership_id: string;
  type: InternalThreadType;
  name?: string | null;
  slug?: string | null;
  entity_type?: InternalEntityType | null;
  entity_id?: string | null;
  created_by?: string | null;
  is_archived: boolean;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
  members?: InternalThreadMember[];
  last_message?: InternalMessage | null;
  unread_count?: number;
  entity_summary?: {
    title: string;
    subtitle?: string;
    badge?: string;
    linkUrl: string;
    imageUrl?: string | null;
    price?: number | null;
  };
}

export interface TeamActivityEvent {
  id: string;
  type: 'transfer' | 'handover' | 'lead_assigned' | 'deal_status' | 'mention' | 'prep_ready';
  title: string;
  description: string;
  timestamp: string;
  actorName: string;
  vehicleInfo?: {
    registration: string;
    make: string;
    model: string;
    imageUrl?: string | null;
  };
  linkUrl?: string;
}
