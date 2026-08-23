export type FeedbackCategory =
  | 'bug'
  | 'confusing'
  | 'feature_request'
  | 'performance'
  | 'other';

export type FeedbackStatus =
  | 'new'
  | 'reviewed'
  | 'planned'
  | 'resolved'
  | 'closed';

export interface DealerFeedback {
  id: string;
  dealership_id: string;
  user_id?: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  route?: string;
  app_version: string;
  user_role?: string;
  browser_info?: string;
  screenshot_url?: string;
  status: FeedbackStatus;
  release_tag?: string;
  operator_notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name?: string;
    email?: string;
  };
  dealership?: {
    name?: string;
  };
}
