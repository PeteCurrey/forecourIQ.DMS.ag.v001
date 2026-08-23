import { createClient } from '@/lib/supabase/server';
import { 
  InternalEntityType, 
  InternalMessage, 
  InternalThread, 
  InternalThreadType,
  TeamActivityEvent 
} from '@/lib/types/chat';

export class ChatService {
  /**
   * Ensure default team channels exist for a dealership.
   */
  static async ensureDefaultChannels(dealershipId: string, createdByUserId?: string): Promise<void> {
    const supabase = await createClient();

    const defaultChannels = [
      { name: 'general', slug: 'general', type: 'channel' as InternalThreadType },
      { name: 'sales', slug: 'sales', type: 'channel' as InternalThreadType },
      { name: 'prep', slug: 'prep', type: 'channel' as InternalThreadType },
    ];

    for (const ch of defaultChannels) {
      const { data: existing } = await supabase
        .from('internal_threads')
        .select('id')
        .eq('dealership_id', dealershipId)
        .eq('slug', ch.slug)
        .maybeSingle();

      if (!existing) {
        await supabase.from('internal_threads').insert({
          dealership_id: dealershipId,
          type: 'channel',
          name: ch.name,
          slug: ch.slug,
          created_by: createdByUserId,
        });
      }
    }
  }

  /**
   * Get or create an entity-linked thread (e.g. from vehicle or deal record).
   */
  static async getOrCreateEntityThread(
    dealershipId: string,
    entityType: InternalEntityType,
    entityId: string,
    name: string,
    createdByUserId: string
  ): Promise<InternalThread> {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('internal_threads')
      .select('*, members:internal_thread_members(*)')
      .eq('dealership_id', dealershipId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();

    if (existing) {
      return existing as InternalThread;
    }

    const { data: created, error } = await supabase
      .from('internal_threads')
      .insert({
        dealership_id: dealershipId,
        type: 'entity',
        name,
        entity_type: entityType,
        entity_id: entityId,
        created_by: createdByUserId,
      })
      .select('*')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create entity thread: ${error?.message}`);
    }

    // Add creator as member
    await supabase.from('internal_thread_members').insert({
      thread_id: created.id,
      user_id: createdByUserId,
      dealership_id: dealershipId,
      role: 'owner',
    });

    return created as InternalThread;
  }

  /**
   * Get or create a Direct Message thread between two dealership users.
   */
  static async getOrCreateDirectThread(
    dealershipId: string,
    currentUserId: string,
    targetUserId: string
  ): Promise<InternalThread> {
    const supabase = await createClient();

    // Look for existing direct thread with both members
    const { data: userThreads } = await supabase
      .from('internal_thread_members')
      .select('thread_id, internal_threads!inner(id, type, dealership_id)')
      .eq('user_id', currentUserId)
      .eq('dealership_id', dealershipId)
      .eq('internal_threads.type', 'direct');

    if (userThreads && userThreads.length > 0) {
      const threadIds = userThreads.map(t => t.thread_id);
      const { data: matchingMember } = await supabase
        .from('internal_thread_members')
        .select('thread_id')
        .in('thread_id', threadIds)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (matchingMember) {
        const { data: thread } = await supabase
          .from('internal_threads')
          .select('*, members:internal_thread_members(*, user:profiles(id, full_name, email, role))')
          .eq('id', matchingMember.thread_id)
          .single();

        if (thread) return thread as InternalThread;
      }
    }

    // Create new direct thread
    const { data: newThread, error } = await supabase
      .from('internal_threads')
      .insert({
        dealership_id: dealershipId,
        type: 'direct',
        created_by: currentUserId,
      })
      .select('*')
      .single();

    if (error || !newThread) {
      throw new Error(`Failed to create DM thread: ${error?.message}`);
    }

    // Add both members
    await supabase.from('internal_thread_members').insert([
      { thread_id: newThread.id, user_id: currentUserId, dealership_id: dealershipId, role: 'owner' },
      { thread_id: newThread.id, user_id: targetUserId, dealership_id: dealershipId, role: 'member' },
    ]);

    return newThread as InternalThread;
  }

  /**
   * List all accessible threads for a dealership user.
   */
  static async listThreads(dealershipId: string, userId: string): Promise<InternalThread[]> {
    const supabase = await createClient();
    await this.ensureDefaultChannels(dealershipId, userId);

    const { data: threads, error } = await supabase
      .from('internal_threads')
      .select(`
        *,
        members:internal_thread_members(*, user:profiles(id, full_name, email, role))
      `)
      .eq('dealership_id', dealershipId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !threads) return [];

    // Filter: channels are public to dealership; DMs & entity threads require membership or open access
    const accessibleThreads = threads.filter(t => {
      if (t.type === 'channel') return true;
      return t.members?.some((m: any) => m.user_id === userId) || t.created_by === userId;
    });

    // Populate entity summary if entity-linked
    const enhanced = await Promise.all(accessibleThreads.map(async (t: any) => {
      let entity_summary = undefined;
      if (t.entity_type && t.entity_id) {
        if (t.entity_type === 'vehicle') {
          const { data: v } = await supabase
            .from('vehicles')
            .select('id, make, model, variant, registration, asking_price, vehicle_images(url, is_primary)')
            .eq('id', t.entity_id)
            .maybeSingle();

          if (v) {
            const primaryImg = v.vehicle_images?.find((i: any) => i.is_primary)?.url || v.vehicle_images?.[0]?.url || null;
            entity_summary = {
              title: `${v.make} ${v.model}`,
              subtitle: v.registration,
              badge: v.variant || undefined,
              linkUrl: `/stock/${v.id}`,
              imageUrl: primaryImg,
              price: v.asking_price,
            };
          }
        } else if (t.entity_type === 'lead') {
          const { data: l } = await supabase
            .from('leads')
            .select('id, first_name, last_name, status, vehicles(make, model)')
            .eq('id', t.entity_id)
            .maybeSingle();

          if (l) {
            entity_summary = {
              title: `${l.first_name} ${l.last_name}`,
              subtitle: l.vehicles ? `${(l.vehicles as any).make} ${(l.vehicles as any).model}` : 'General Enquiry',
              badge: l.status,
              linkUrl: `/leads/${l.id}`,
            };
          }
        } else if (t.entity_type === 'deal') {
          const { data: d } = await supabase
            .from('deals')
            .select('id, deal_number, status, agreed_price, vehicles(make, model, registration)')
            .eq('id', t.entity_id)
            .maybeSingle();

          if (d) {
            entity_summary = {
              title: d.deal_number || 'Deal',
              subtitle: d.vehicles ? `${(d.vehicles as any).make} ${(d.vehicles as any).model}` : 'Vehicle Deal',
              badge: d.status,
              linkUrl: `/deals/${d.id}`,
              price: d.agreed_price,
            };
          }
        }
      }

      return {
        ...t,
        entity_summary,
      };
    }));

    return enhanced as InternalThread[];
  }

  /**
   * Get messages for a thread.
   */
  static async getMessages(threadId: string): Promise<InternalMessage[]> {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from('internal_messages')
      .select('*, sender:profiles(id, full_name, email, role), attachments:internal_message_attachments(*)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error || !messages) return [];
    return messages as InternalMessage[];
  }

  /**
   * Post an internal message with @mention detection.
   */
  static async postMessage(
    dealershipId: string,
    threadId: string,
    senderUserId: string,
    body: string,
    attachments: Array<{ name: string; url: string; type: string; size?: number }> = []
  ): Promise<InternalMessage> {
    const supabase = await createClient();

    const { data: message, error } = await supabase
      .from('internal_messages')
      .insert({
        dealership_id: dealershipId,
        thread_id: threadId,
        sender_user_id: senderUserId,
        body: body.trim(),
      })
      .select('*, sender:profiles(id, full_name, email, role)')
      .single();

    if (error || !message) {
      throw new Error(`Failed to post message: ${error?.message}`);
    }

    // Insert attachments if any
    if (attachments.length > 0) {
      await supabase.from('internal_message_attachments').insert(
        attachments.map(a => ({
          message_id: message.id,
          dealership_id: dealershipId,
          file_name: a.name,
          file_url: a.url,
          file_type: a.type,
          file_size_bytes: a.size || null,
        }))
      );
    }

    // Update thread last_message_at
    await supabase
      .from('internal_threads')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', threadId);

    // Parse and handle @mentions
    const mentionMatches = body.match(/@([a-zA-Z0-9._-]+)/g);
    if (mentionMatches && mentionMatches.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('dealership_id', dealershipId);

      for (const m of mentionMatches) {
        const queryName = m.slice(1).toLowerCase();
        const target = profiles?.find(p => p.full_name?.toLowerCase().includes(queryName));
        if (target && target.id !== senderUserId) {
          await supabase.from('internal_message_mentions').insert({
            message_id: message.id,
            mentioned_user_id: target.id,
            dealership_id: dealershipId,
            is_read: false,
          });
        }
      }
    }

    return message as InternalMessage;
  }

  /**
   * Get unread mention count for a user.
   */
  static async getUnreadCount(dealershipId: string, userId: string): Promise<number> {
    const supabase = await createClient();

    const { count } = await supabase
      .from('internal_message_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId)
      .eq('mentioned_user_id', userId)
      .eq('is_read', false);

    return count || 0;
  }

  /**
   * Fetch meaningful operational team activity for the dashboard.
   */
  static async getTeamActivity(dealershipId: string, limit: number = 5): Promise<TeamActivityEvent[]> {
    const supabase = await createClient();

    const [
      { data: recentTransfers },
      { data: recentHandovers },
      { data: recentLeadAssignments },
      { data: recentMentions },
    ] = await Promise.all([
      supabase.from('stock_transfers')
        .select('id, transfer_reference, status, updated_at, vehicles(registration, make, model, vehicle_images(url, is_primary)), destination_location:dealership_locations!stock_transfers_destination_location_id_fkey(name), requester:profiles!stock_transfers_requested_by_fkey(full_name)')
        .eq('dealership_id', dealershipId)
        .order('updated_at', { ascending: false })
        .limit(3),
      supabase.from('deals')
        .select('id, deal_number, status, updated_at, salesperson:profiles!deals_salesperson_id_fkey(full_name), vehicles(registration, make, model, vehicle_images(url, is_primary))')
        .eq('dealership_id', dealershipId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(3),
      supabase.from('leads')
        .select('id, first_name, last_name, updated_at, assigned_user:profiles!leads_assigned_to_fkey(full_name), vehicles(registration, make, model, vehicle_images(url, is_primary))')
        .eq('dealership_id', dealershipId)
        .not('assigned_to', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(3),
      supabase.from('internal_message_mentions')
        .select('id, created_at, message:internal_messages(body, sender:profiles(full_name), thread:internal_threads(name, entity_type, entity_id))')
        .eq('dealership_id', dealershipId)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const events: TeamActivityEvent[] = [];

    // Map transfers
    (recentTransfers || []).forEach((t: any) => {
      const v = t.vehicles;
      const primaryImg = v?.vehicle_images?.find((i: any) => i.is_primary)?.url || v?.vehicle_images?.[0]?.url || null;
      events.push({
        id: `transfer_${t.id}`,
        type: 'transfer',
        title: `Stock Transfer: ${v ? `${v.make} ${v.model}` : 'Vehicle'}`,
        description: `${t.requester?.full_name || 'Team member'} moved vehicle to ${t.destination_location?.name || 'destination site'} (${t.status})`,
        timestamp: t.updated_at,
        actorName: t.requester?.full_name || 'Operations',
        vehicleInfo: v ? { registration: v.registration, make: v.make, model: v.model, imageUrl: primaryImg } : undefined,
        linkUrl: `/stock/transfers`,
      });
    });

    // Map handovers
    (recentHandovers || []).forEach((d: any) => {
      const v = d.vehicles;
      const primaryImg = v?.vehicle_images?.find((i: any) => i.is_primary)?.url || v?.vehicle_images?.[0]?.url || null;
      events.push({
        id: `handover_${d.id}`,
        type: 'handover',
        title: `Vehicle Handover Completed`,
        description: `${d.salesperson?.full_name || 'Sales'} finalized delivery for ${v ? `${v.make} ${v.model} (${v.registration})` : d.deal_number}`,
        timestamp: d.updated_at,
        actorName: d.salesperson?.full_name || 'Sales Team',
        vehicleInfo: v ? { registration: v.registration, make: v.make, model: v.model, imageUrl: primaryImg } : undefined,
        linkUrl: `/deals/${d.id}`,
      });
    });

    // Map lead assignments
    (recentLeadAssignments || []).forEach((l: any) => {
      const v = l.vehicles;
      const primaryImg = v?.vehicle_images?.find((i: any) => i.is_primary)?.url || v?.vehicle_images?.[0]?.url || null;
      events.push({
        id: `lead_${l.id}`,
        type: 'lead_assigned',
        title: `Lead Assigned`,
        description: `New enquiry from ${l.first_name} ${l.last_name} assigned to ${l.assigned_user?.full_name || 'sales'}`,
        timestamp: l.updated_at,
        actorName: l.assigned_user?.full_name || 'Sales Manager',
        vehicleInfo: v ? { registration: v.registration, make: v.make, model: v.model, imageUrl: primaryImg } : undefined,
        linkUrl: `/leads/${l.id}`,
      });
    });

    // Sort by timestamp descending and take limit
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}
