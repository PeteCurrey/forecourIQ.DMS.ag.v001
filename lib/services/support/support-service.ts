import { createClient } from '@/lib/supabase/server';
import { 
  SupportCase, 
  SupportCategory, 
  SupportMessage, 
  SupportPriority, 
  SupportStatus 
} from '@/lib/types/platform';

export class SupportService {
  /**
   * Create a new support case.
   */
  static async createCase(
    dealershipId: string,
    openedByUserId: string,
    category: SupportCategory,
    subject: string,
    description: string,
    priority: SupportPriority = 'normal',
    attachments: string[] = []
  ): Promise<SupportCase> {
    const supabase = await createClient();

    const caseNumber = `FIQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: supportCase, error } = await supabase
      .from('support_cases')
      .insert({
        dealership_id: dealershipId,
        opened_by: openedByUserId,
        case_number: caseNumber,
        category,
        priority,
        status: 'open',
        subject: subject.trim(),
        description: description.trim(),
      })
      .select('*')
      .single();

    if (error || !supportCase) {
      throw new Error(`Failed to create support case: ${error?.message || 'Database error'}`);
    }

    // Get user full name for initial message
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', openedByUserId)
      .single();

    const senderName = userProfile?.full_name || 'Dealer User';

    // Insert initial message
    await supabase.from('support_messages').insert({
      case_id: supportCase.id,
      sender_type: 'customer',
      sender_id: openedByUserId,
      sender_name: senderName,
      message: description.trim(),
      attachments: attachments as any,
      is_internal_note: false,
    });

    return supportCase as SupportCase;
  }

  /**
   * List all support cases for a dealership.
   */
  static async listCases(dealershipId: string): Promise<SupportCase[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('support_cases')
      .select('*, dealership:dealerships(name, city)')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching support cases:', error);
      return [];
    }

    return (data || []) as SupportCase[];
  }

  /**
   * Get case details and full message transcript.
   */
  static async getCaseWithMessages(caseId: string, isOperator: boolean = false): Promise<{
    supportCase: SupportCase;
    messages: SupportMessage[];
  }> {
    const supabase = await createClient();

    const { data: supportCase, error: caseErr } = await supabase
      .from('support_cases')
      .select('*, dealership:dealerships(name, city)')
      .eq('id', caseId)
      .single();

    if (caseErr || !supportCase) {
      throw new Error('Support case not found');
    }

    let messageQuery = supabase
      .from('support_messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (!isOperator) {
      messageQuery = messageQuery.eq('is_internal_note', false);
    }

    const { data: messages } = await messageQuery;

    return {
      supportCase: supportCase as SupportCase,
      messages: (messages || []) as SupportMessage[],
    };
  }

  /**
   * Post a reply message to a support case.
   */
  static async addMessage(
    caseId: string,
    senderType: 'customer' | 'operator',
    senderId: string,
    senderName: string,
    message: string,
    attachments: string[] = [],
    isInternalNote: boolean = false
  ): Promise<SupportMessage> {
    const supabase = await createClient();

    const { data: createdMsg, error } = await supabase
      .from('support_messages')
      .insert({
        case_id: caseId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message: message.trim(),
        attachments: attachments as any,
        is_internal_note: isInternalNote,
      })
      .select('*')
      .single();

    if (error || !createdMsg) {
      throw new Error(`Failed to post message: ${error?.message}`);
    }

    // Automatically update case status depending on sender
    if (!isInternalNote) {
      const nextStatus = senderType === 'customer' ? 'waiting_on_forecouriq' : 'waiting_on_customer';
      await supabase
        .from('support_cases')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', caseId);
    }

    return createdMsg as SupportMessage;
  }

  /**
   * Update support case status.
   */
  static async updateCaseStatus(
    caseId: string,
    status: SupportStatus,
    resolutionNotes?: string
  ): Promise<void> {
    const supabase = await createClient();

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }
    }

    await supabase.from('support_cases').update(updates).eq('id', caseId);
  }
}
