import { createClient } from '@/lib/supabase/server';
import { DealerFeedback, FeedbackCategory, FeedbackStatus } from '@/lib/types/feedback';

export class FeedbackService {
  /**
   * Submit in-app dealer feedback with client metadata.
   */
  static async submitFeedback(
    dealershipId: string,
    data: {
      category: FeedbackCategory;
      title: string;
      description: string;
      route?: string;
      appVersion?: string;
      userRole?: string;
      browserInfo?: string;
      screenshotUrl?: string;
    },
    userId?: string
  ): Promise<DealerFeedback> {
    const supabase = await createClient();

    const { data: created, error } = await supabase
      .from('dealer_feedback')
      .insert({
        dealership_id: dealershipId,
        user_id: userId || null,
        category: data.category,
        title: data.title,
        description: data.description,
        route: data.route,
        app_version: data.appVersion || '1.0.0-rc.1',
        user_role: data.userRole,
        browser_info: data.browserInfo,
        screenshot_url: data.screenshotUrl,
        status: 'new',
      })
      .select('*, dealerships(name), profiles(full_name, email)')
      .single();

    if (error) throw new Error(`Failed to submit feedback: ${error.message}`);
    return created as any;
  }

  /**
   * List feedback for Platform Operator console.
   */
  static async listFeedback(
    statusFilter?: FeedbackStatus | 'all',
    limit: number = 50
  ): Promise<DealerFeedback[]> {
    const supabase = await createClient();

    let query = supabase
      .from('dealer_feedback')
      .select('*, dealerships(name), profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Failed to list feedback:', error);
      return [];
    }

    return (data || []).map(f => ({
      ...f,
      user: (f as any).profiles,
      dealership: (f as any).dealerships,
    }));
  }

  /**
   * Update feedback triage status, operator notes, or link to release candidate.
   */
  static async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    operatorNotes?: string,
    releaseTag?: string
  ): Promise<DealerFeedback> {
    const supabase = await createClient();

    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (operatorNotes !== undefined) updatePayload.operator_notes = operatorNotes;
    if (releaseTag !== undefined) updatePayload.release_tag = releaseTag;

    const { data: updated, error } = await supabase
      .from('dealer_feedback')
      .update(updatePayload)
      .eq('id', feedbackId)
      .select('*, dealerships(name), profiles(full_name, email)')
      .single();

    if (error) throw new Error(`Failed to update feedback: ${error.message}`);
    return updated as any;
  }
}
