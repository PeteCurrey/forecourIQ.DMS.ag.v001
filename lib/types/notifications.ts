export type NotificationCategory =
  | 'sales'
  | 'stock'
  | 'deals'
  | 'transfers'
  | 'team'
  | 'compliance'
  | 'iq'
  | 'system';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export interface DealershipNotification {
  id: string;
  dealership_id: string;
  user_id?: string | null;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  entity_type?: string | null;
  entity_id?: string | null;
  link_url?: string | null;
  read_at?: string | null;
  dismissed_at?: string | null;
  fingerprint?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  dealership_id: string;
  sales_enabled: boolean;
  stock_enabled: boolean;
  deals_enabled: boolean;
  transfers_enabled: boolean;
  team_enabled: boolean;
  compliance_enabled: boolean;
  iq_enabled: boolean;
  system_enabled: boolean;
  updated_at: string;
}
