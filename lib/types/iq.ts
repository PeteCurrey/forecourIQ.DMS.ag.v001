/**
 * ForecourIQ DMS — Phase 8: IQ Operating Layer Type Contracts
 */

export type IQActionMode = 'suggest' | 'assist' | 'controlled_automation';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationConfidence = 'high' | 'medium' | 'low' | 'unverified';
export type RecommendationStatus = 'new' | 'reviewed' | 'accepted' | 'dismissed' | 'action_pending' | 'action_completed' | 'expired';

export type AIActionStatus = 
  | 'draft' 
  | 'awaiting_approval' 
  | 'approved' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'rejected' 
  | 'cancelled' 
  | 'expired';

export type BriefingType = 'daily' | 'weekly';

export interface DailyBriefing {
  id: string;
  dealership_id: string;
  briefing_date: string;
  briefing_type: BriefingType;
  summary: string;
  structured_payload: BriefingStructuredPayload;
  model_provider: string;
  model_name: string;
  input_snapshot: BriefingFactPack;
  status: 'draft' | 'published' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BriefingStructuredPayload {
  yesterday: {
    units_sold: number;
    gross_profit: number;
    new_leads: number;
    appointments_completed: number;
  };
  today: {
    test_drives: number;
    handovers: number;
    followups_due: number;
    prep_due: number;
  };
  needs_attention: {
    unanswered_leads: number;
    compliance_blockers: number;
    stale_stock_capital: number;
    failed_feed_updates: number;
    items: string[];
  };
  intelligence: {
    buying_opportunities: number;
    pricing_reviews: number;
    stock_gaps: number;
    summary: string;
  };
  systems: {
    status: 'healthy' | 'attention_required';
    issues: string[];
  };
}

export interface BriefingFactPack {
  dealership_id: string;
  generated_at: string;
  stock: {
    total_retail: number;
    total_invested: number;
    potential_gross: number;
    average_days: number;
    over_60_days: number;
    in_prep: number;
  };
  sales: {
    yesterday_sold: number;
    yesterday_gross: number;
    leads_last_24h: number;
    unanswered_leads_48h: number;
  };
  agenda: {
    today_appointments: number;
    today_handovers: number;
    today_prep_deadlines: number;
  };
  compliance: {
    blocked_deals: number;
  };
  integrations: {
    live_adverts: number;
    feed_errors: number;
    unconfigured: string[];
  };
  intelligence: {
    active_buying_signals: number;
    active_pricing_signals: number;
  };
}

export interface AIRecommendation {
  id: string;
  dealership_id: string;
  category: 'sales' | 'stock' | 'buying' | 'pricing' | 'preparation' | 'deal' | 'compliance' | 'website' | 'advertising' | 'integration';
  entity_type?: string;
  entity_id?: string;
  title: string;
  summary: string;
  priority: RecommendationPriority;
  confidence: RecommendationConfidence;
  status: RecommendationStatus;
  fingerprint: string;
  source_signal_id?: string;
  evidence: Array<{ label: string; value: string | number; link?: string }>;
  suggested_action?: {
    action_type: string;
    label: string;
    payload: Record<string, any>;
  };
  expires_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  dismissed_reason?: string;
  outcome?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIAction {
  id: string;
  dealership_id: string;
  requested_by?: string;
  recommendation_id?: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  input_payload: Record<string, any>;
  status: AIActionStatus;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  execution_started_at?: string;
  executed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  result_reference?: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DealershipIQSettings {
  dealership_id: string;
  iq_enabled: boolean;
  default_action_mode: IQActionMode;
  automation_paused: boolean;
  briefing_time: string;
  briefing_email: boolean;
  briefing_days: string[];
  action_policies: Record<string, {
    mode: 'auto' | 'assist' | 'approval_required' | 'disabled';
    allowed_roles: string[];
  }>;
  monitoring_rules: {
    unanswered_lead_threshold_minutes: number;
    overdue_followup_hours: number;
    ageing_stock_review_days: number;
    urgent_stock_review_days: number;
  };
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AskIQRequest {
  question: string;
  conversation_id?: string;
  context_entity?: {
    type: string;
    id: string;
  };
}

export interface AskIQResponse {
  answer: string;
  evidence: Array<{ label: string; value: string | number; link?: string }>;
  suggested_actions: Array<{
    action_type: string;
    label: string;
    payload: Record<string, any>;
  }>;
  conversation_id: string;
  model_used: string;
  tokens_used: number;
}
