import { createClient } from '@/lib/supabase/server';
import { 
  UserInvitation, 
  UserOffboardingSummary, 
  UserRoleType 
} from '@/lib/types/platform';
import crypto from 'crypto';

export class UserService {
  /**
   * Create a secure tokenized staff invitation.
   */
  static async createInvitation(
    dealershipId: string,
    email: string,
    fullName: string,
    role: UserRoleType,
    invitedByUserId?: string,
    locationId?: string
  ): Promise<UserInvitation> {
    const supabase = await createClient();

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in dealership
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, is_active')
      .eq('dealership_id', dealershipId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile && existingProfile.is_active !== false) {
      throw new Error(`A user with email ${normalizedEmail} is already active in this dealership.`);
    }

    // Revoke any existing pending invitations for this email
    await supabase
      .from('user_invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert({
        dealership_id: dealershipId,
        email: normalizedEmail,
        full_name: fullName.trim(),
        role: role,
        location_id: locationId || null,
        token: token,
        status: 'pending',
        invited_by: invitedByUserId || null,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error || !invitation) {
      throw new Error(`Failed to create invitation: ${error?.message || 'Database error'}`);
    }

    // Log security event
    await supabase.from('security_events').insert({
      dealership_id: dealershipId,
      user_id: invitedByUserId,
      event_type: 'user_invited',
      metadata: { email: normalizedEmail, role, invitationId: invitation.id },
    });

    return invitation as UserInvitation;
  }

  /**
   * Get orphaned work counts for a user before or after deactivation.
   */
  static async getWorkloadSummary(dealershipId: string, userId: string): Promise<UserOffboardingSummary> {
    const supabase = await createClient();

    const [
      { count: leadsCount },
      { count: tasksCount },
      { count: apptsCount },
      { count: dealsCount },
    ] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealership_id', dealershipId).eq('assigned_to', userId).not('status', 'in', '("won","lost")'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('dealership_id', dealershipId).eq('assigned_to', userId).eq('status', 'open'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('dealership_id', dealershipId).eq('assigned_to', userId).gte('start_at', new Date().toISOString()),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('dealership_id', dealershipId).eq('salesperson_id', userId).not('status', 'in', '("completed","cancelled")'),
    ]);

    return {
      userId,
      activeLeadsCount: leadsCount || 0,
      openTasksCount: tasksCount || 0,
      activeAppointmentsCount: apptsCount || 0,
      managedDealsCount: dealsCount || 0,
    };
  }

  /**
   * Reassign all active work from one user to another.
   */
  static async reassignWorkload(
    dealershipId: string, 
    fromUserId: string, 
    toUserId: string
  ): Promise<{ reassignedCount: number }> {
    const supabase = await createClient();

    let count = 0;

    // 1. Reassign active leads
    const { data: updatedLeads } = await supabase
      .from('leads')
      .update({ assigned_to: toUserId, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('assigned_to', fromUserId)
      .not('status', 'in', '("won","lost")')
      .select('id');

    count += updatedLeads?.length || 0;

    // 2. Reassign open tasks
    const { data: updatedTasks } = await supabase
      .from('tasks')
      .update({ assigned_to: toUserId, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('assigned_to', fromUserId)
      .eq('status', 'open')
      .select('id');

    count += updatedTasks?.length || 0;

    // 3. Reassign future appointments
    const { data: updatedAppts } = await supabase
      .from('appointments')
      .update({ assigned_to: toUserId, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('assigned_to', fromUserId)
      .gte('start_at', new Date().toISOString())
      .select('id');

    count += updatedAppts?.length || 0;

    // 4. Reassign active deals
    const { data: updatedDeals } = await supabase
      .from('deals')
      .update({ salesperson_id: toUserId, updated_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .eq('salesperson_id', fromUserId)
      .not('status', 'in', '("completed","cancelled")')
      .select('id');

    count += updatedDeals?.length || 0;

    return { reassignedCount: count };
  }

  /**
   * Deactivate a user safely, preserving all audit and deal history.
   */
  static async deactivateUser(
    dealershipId: string,
    targetUserId: string,
    deactivatedByUserId: string,
    reassignToUserId?: string
  ): Promise<UserOffboardingSummary> {
    const supabase = await createClient();

    // Prevent self-deactivation of the last admin
    if (targetUserId === deactivatedByUserId) {
      const { data: adminCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('dealership_id', dealershipId)
        .in('role', ['admin', 'dealer_principal'])
        .eq('is_active', true);

      if ((adminCount?.length || 0) <= 1) {
        throw new Error('Cannot deactivate the sole remaining Administrator or Dealer Principal.');
      }
    }

    // Perform reassignment if target user specified
    if (reassignToUserId && reassignToUserId !== targetUserId) {
      await this.reassignWorkload(dealershipId, targetUserId, reassignToUserId);
    }

    // Mark profile inactive
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: deactivatedByUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .eq('dealership_id', dealershipId);

    if (updateError) {
      throw new Error(`Failed to deactivate user: ${updateError.message}`);
    }

    // Log security event
    await supabase.from('security_events').insert({
      dealership_id: dealershipId,
      user_id: targetUserId,
      event_type: 'user_deactivated',
      metadata: { deactivatedBy: deactivatedByUserId, reassignedTo: reassignToUserId },
    });

    const summary = await this.getWorkloadSummary(dealershipId, targetUserId);
    return { ...summary, reassignedToUserId: reassignToUserId };
  }
}
