import { createClient } from '@/lib/supabase/server';
import { 
  DealershipNotification, 
  NotificationCategory, 
  NotificationPriority, 
  UserNotificationPreferences 
} from '@/lib/types/notifications';

export class NotificationService {
  /**
   * Create an operational notification with optional fingerprint deduplication.
   */
  static async createNotification(
    dealershipId: string,
    data: {
      type: string;
      category: NotificationCategory;
      priority?: NotificationPriority;
      title: string;
      body: string;
      entityType?: string;
      entityId?: string;
      linkUrl?: string;
      fingerprint?: string;
      metadata?: Record<string, any>;
    },
    userId?: string | null
  ): Promise<DealershipNotification | null> {
    try {
      const supabase = await createClient();

      // Check fingerprint deduplication if provided
      if (data.fingerprint) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('dealership_id', dealershipId)
          .eq('fingerprint', data.fingerprint)
          .maybeSingle();

        if (existing) {
          return null; // Already notified for this exact event/threshold
        }
      }

      // Check user category preferences if targeted to a specific user
      if (userId) {
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (prefs) {
          const prefKey = `${data.category}_enabled` as keyof UserNotificationPreferences;
          if (prefs[prefKey] === false && data.priority !== 'critical') {
            return null; // User opted out of this category (non-critical)
          }
        }
      }

      const { data: created, error } = await supabase
        .from('notifications')
        .insert({
          dealership_id: dealershipId,
          user_id: userId || null,
          type: data.type,
          category: data.category,
          priority: data.priority || 'normal',
          title: data.title,
          body: data.body,
          entity_type: data.entityType || null,
          entity_id: data.entityId || null,
          link_url: data.linkUrl || null,
          fingerprint: data.fingerprint || null,
          metadata: data.metadata || {},
        })
        .select('*')
        .single();

      if (error) {
        console.warn('Failed to insert notification:', error.message);
        return null;
      }

      return created as DealershipNotification;
    } catch (err) {
      console.warn('Notification creation error:', err);
      return null;
    }
  }

  /**
   * List notifications for the authenticated user/dealership.
   */
  static async listNotifications(
    dealershipId: string,
    userId: string,
    limit: number = 30
  ): Promise<DealershipNotification[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('dealership_id', dealershipId)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Failed to list notifications:', error);
      return [];
    }

    return (data || []) as DealershipNotification[];
  }

  /**
   * Get total unread notifications count.
   */
  static async getUnreadCount(dealershipId: string, userId: string): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .is('read_at', null);

    if (error) return 0;
    return count || 0;
  }

  /**
   * Mark a single notification as read.
   */
  static async markRead(dealershipId: string, notificationId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('dealership_id', dealershipId);

    return !error;
  }

  /**
   * Mark all notifications as read for a user/dealership.
   */
  static async markAllRead(dealershipId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('dealership_id', dealershipId)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .is('read_at', null);

    return !error;
  }

  /**
   * Get or initialize user notification preferences.
   */
  static async getPreferences(userId: string, dealershipId: string): Promise<UserNotificationPreferences> {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return existing as UserNotificationPreferences;

    // Create default preferences
    const { data: created } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        dealership_id: dealershipId,
      })
      .select('*')
      .single();

    return created as UserNotificationPreferences;
  }

  /**
   * Update user notification preferences.
   */
  static async updatePreferences(
    userId: string,
    dealershipId: string,
    prefs: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        dealership_id: dealershipId,
        ...prefs,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update preferences: ${error.message}`);
    return data as UserNotificationPreferences;
  }
}
