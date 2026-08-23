export type AnalyticsEventName =
  | 'session_started'
  | 'vehicle_created'
  | 'stock_import_completed'
  | 'lead_received'
  | 'lead_responded'
  | 'appointment_created'
  | 'deal_created'
  | 'deal_completed'
  | 'transfer_completed'
  | 'team_message_sent'
  | 'iq_question_asked'
  | 'iq_recommendation_reviewed'
  | 'brief_viewed'
  | 'integration_connected'
  | 'website_lead_received'
  | 'support_case_created';

export type AnalyticsCategory =
  | 'auth'
  | 'stock'
  | 'crm'
  | 'deals'
  | 'transfers'
  | 'chat'
  | 'iq'
  | 'website'
  | 'support'
  | 'billing';

export interface ProductAnalyticsEvent {
  id: string;
  dealership_id: string;
  user_id?: string;
  event_name: AnalyticsEventName;
  event_category: AnalyticsCategory;
  properties: Record<string, any>;
  created_at: string;
}

export type ActivationMilestone =
  | 'first_user_invited'
  | 'first_vehicle_added'
  | 'first_stock_import'
  | 'first_lead_received'
  | 'first_customer_reply'
  | 'first_deal_created'
  | 'first_sale_completed'
  | 'first_iq_used'
  | 'first_website_lead'
  | 'first_transfer_completed';

export interface DealershipActivationMilestone {
  id: string;
  dealership_id: string;
  milestone: ActivationMilestone;
  achieved_at: string;
  elapsed_seconds_from_signup?: number;
  metadata?: Record<string, any>;
}

export interface ActivationSummary {
  dealershipId: string;
  signupDate: string;
  milestones: Record<ActivationMilestone, { achieved: boolean; achievedAt?: string; elapsedHours?: number }>;
  timeToFirstVehicleHours?: number;
  timeToFirstLeadHours?: number;
  timeToFirstDealHours?: number;
  timeToFirstSaleHours?: number;
}
