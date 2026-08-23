// ==============================================================================
// FORECOURTIQ DMS — PHASE 9 TYPE CONTRACTS: PLATFORM & PILOT READINESS
// ==============================================================================

export type OnboardingStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'blocked' 
  | 'ready_for_review' 
  | 'complete' 
  | 'paused' 
  | 'cancelled';

export type OnboardingStepId = 
  | 'dealership'
  | 'locations'
  | 'users'
  | 'stock'
  | 'integrations'
  | 'communications'
  | 'website'
  | 'compliance'
  | 'billing'
  | 'review';

export interface OnboardingBlocker {
  code: string;
  step: OnboardingStepId;
  message: string;
  severity: 'blocker' | 'warning';
  actionUrl: string;
}

export interface DealershipOnboardingState {
  dealership_id: string;
  status: OnboardingStatus;
  current_step: OnboardingStepId;
  steps_completed: OnboardingStepId[];
  blockers: OnboardingBlocker[];
  started_at: string;
  completed_at?: string | null;
  owner_user_id?: string | null;
  assigned_forecouriq_user_id?: string | null;
  review_notes?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GoLiveEvaluationResult {
  dealershipId: string;
  isReady: boolean;
  score: number; // 0 - 100
  totalChecks: number;
  passedChecks: number;
  blockers: OnboardingBlocker[];
  warnings: OnboardingBlocker[];
  checklist: {
    dealershipConfigured: boolean;
    primaryLocationConfigured: boolean;
    adminAccountActive: boolean;
    stockReadyOrImported: boolean;
    billingConfigured: boolean;
    complianceReviewed: boolean;
    communicationsVerified: boolean;
    websiteConfigured: boolean;
  };
}

// ------------------------------------------------------------------------------
// Data Import Types
// ------------------------------------------------------------------------------
export type ImportType = 'stock' | 'customers' | 'sales_history';
export type ImportStatus = 'pending' | 'validating' | 'ready' | 'importing' | 'completed' | 'failed' | 'cancelled';

export interface RowValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface DataImportJob {
  id: string;
  dealership_id: string;
  import_type: ImportType;
  status: ImportStatus;
  file_name: string;
  file_reference?: string | null;
  column_mapping: Record<string, string>;
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  rows_imported: number;
  errors: RowValidationError[];
  created_by?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CSVParseValidationResult {
  totalRows: number;
  validRows: any[];
  invalidRows: any[];
  errors: RowValidationError[];
  preview: any[];
}

// ------------------------------------------------------------------------------
// User Invitation & Lifecycle Types
// ------------------------------------------------------------------------------
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'failed';
export type UserRoleType = 'admin' | 'dealer_principal' | 'sales' | 'prep' | 'finance' | 'compliance';

export interface UserInvitation {
  id: string;
  dealership_id: string;
  email: string;
  full_name: string;
  role: UserRoleType;
  location_id?: string | null;
  token: string;
  status: InvitationStatus;
  invited_by?: string | null;
  expires_at: string;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserOffboardingSummary {
  userId: string;
  activeLeadsCount: number;
  openTasksCount: number;
  activeAppointmentsCount: number;
  managedDealsCount: number;
  reassignedToUserId?: string;
}

// ------------------------------------------------------------------------------
// Plan, Subscription & Entitlement Types
// ------------------------------------------------------------------------------
export type PlanTier = 'starter' | 'professional' | 'elite';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'payment_failed' | 'cancelled' | 'suspended';

export interface DealershipPlan {
  id: string;
  name: string;
  tier: PlanTier;
  monthly_price_gbp: number;
  max_vehicles: number | null; // null = unlimited
  max_users: number | null;    // null = unlimited
  max_locations: number;
  website_included: boolean;
  iq_included: boolean;
  competitor_tracking: boolean;
  accounting_sync: boolean;
  api_access: boolean;
  features: string[];
  created_at: string;
}

export interface Subscription {
  id: string;
  dealership_id: string;
  plan_id: string;
  provider: 'stripe';
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  status: SubscriptionStatus;
  billing_period: 'monthly' | 'annual';
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  grace_period_ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlementsCheck {
  allowed: boolean;
  reason?: string;
  isSoftLimitApproaching?: boolean;
  currentCount: number;
  limit: number | null;
  planTier: PlanTier;
}

// ------------------------------------------------------------------------------
// Support Domain Types
// ------------------------------------------------------------------------------
export type SupportCategory = 
  | 'account' 
  | 'billing' 
  | 'stock' 
  | 'website' 
  | 'integration' 
  | 'crm' 
  | 'deal' 
  | 'compliance' 
  | 'iq' 
  | 'technical' 
  | 'other';

export type SupportPriority = 'normal' | 'high' | 'critical';
export type SupportStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'waiting_on_forecouriq' | 'resolved' | 'closed';

export interface SupportCase {
  id: string;
  dealership_id: string;
  opened_by?: string | null;
  assigned_to?: string | null;
  case_number: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  subject: string;
  description: string;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  dealership?: { name: string; city?: string };
}

export interface SupportMessage {
  id: string;
  case_id: string;
  sender_type: 'customer' | 'operator' | 'system';
  sender_id?: string | null;
  sender_name: string;
  message: string;
  attachments: string[];
  is_internal_note: boolean;
  created_at: string;
}

// ------------------------------------------------------------------------------
// Platform Admin & Pilot Types
// ------------------------------------------------------------------------------
export type PlatformOperatorRole = 'superadmin' | 'support' | 'operator' | 'analyst';
export type DealershipLifecycleStatus = 'prospect' | 'onboarding' | 'pilot' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'archived';

export interface PlatformOperator {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: PlatformOperatorRole;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealershipPlatformSummary {
  id: string;
  name: string;
  city?: string;
  lifecycle_status: DealershipLifecycleStatus;
  subscription_status?: SubscriptionStatus;
  plan_tier?: PlanTier;
  stock_count: number;
  user_count: number;
  open_support_cases: number;
  pilot_started_at?: string | null;
  pilot_owner?: string | null;
  is_demo: boolean;
  onboarding_status?: OnboardingStatus;
  created_at: string;
}

export interface PlatformGlobalMetrics {
  totalDealerships: number;
  activePilots: number;
  activeSubscriptions: number;
  estimatedMRR: number;
  openSupportCases: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  failedJobs24h: number;
  aiProviderHealth: 'operational' | 'degraded' | 'offline';
}

// ------------------------------------------------------------------------------
// Unit Economics & Usage Telemetry
// ------------------------------------------------------------------------------
export interface DealershipUnitEconomics {
  dealershipId: string;
  dealershipName: string;
  subscriptionRevenueGbp: number;
  aiCostGbp: number;
  messagingCostGbp: number;
  vehicleDataCostGbp: number;
  storageCostGbp: number;
  totalVariableCostGbp: number;
  estimatedContributionMarginGbp: number;
  marginPercentage: number;
}

// ------------------------------------------------------------------------------
// GDPR Privacy Export Types
// ------------------------------------------------------------------------------
export interface CustomerGDPRExport {
  exportDate: string;
  dealershipName: string;
  customerProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    postcode?: string;
    marketingConsent: boolean;
    createdAt: string;
  };
  enquiryHistory: Array<{
    id: string;
    source: string;
    vehicleOfInterest?: string;
    status: string;
    createdAt: string;
  }>;
  dealHistory: Array<{
    id: string;
    dealNumber: string;
    vehicle: string;
    status: string;
    agreedPrice: number;
    createdAt: string;
  }>;
  conversations: Array<{
    channel: string;
    messageCount: number;
    lastContactAt: string;
  }>;
  appointments: Array<{
    title: string;
    startAt: string;
    location?: string;
  }>;
}
