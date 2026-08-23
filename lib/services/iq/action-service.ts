import { createClient } from '@/lib/supabase/server';
import { AuditService } from '@/lib/services/audit';
import { AIAction, AIActionStatus } from '@/lib/types/iq';

export interface RegisterActionDef {
  actionType: string;
  label: string;
  requiredPermission: string;
  defaultMode: 'auto' | 'assist' | 'approval_required';
  isHighRisk: boolean;
  validatePayload: (payload: any) => { isValid: boolean; error?: string };
  execute: (dealershipId: string, userId: string, payload: any) => Promise<{ success: boolean; result?: any; error?: string }>;
}

export const ACTION_REGISTRY: Record<string, RegisterActionDef> = {
  'lead.create_followup': {
    actionType: 'lead.create_followup',
    label: 'Create Lead Follow-up Task',
    requiredPermission: 'leads.update',
    defaultMode: 'auto',
    isHighRisk: false,
    validatePayload: (p) => {
      if (!p.lead_id || !p.title) return { isValid: false, error: 'lead_id and title are required' };
      return { isValid: true };
    },
    execute: async (dealershipId, userId, payload) => {
      const supabase = await createClient();
      const { data: lead } = await supabase.from('leads').select('id, first_name, last_name, assigned_to').eq('id', payload.lead_id).single();
      if (!lead) return { success: false, error: 'Lead not found' };

      const { data: task, error } = await supabase.from('tasks').insert({
        dealership_id: dealershipId,
        title: payload.title,
        description: payload.description || `Follow-up required for customer ${lead.first_name} ${lead.last_name}`,
        due_at: payload.due_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: payload.assigned_to || lead.assigned_to || userId,
        status: 'open',
        priority: 'high',
        category: 'lead_followup',
        lead_id: lead.id,
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, result: { task_id: task.id } };
    }
  },

  'task.create': {
    actionType: 'task.create',
    label: 'Create Operational Task',
    requiredPermission: 'tasks.create',
    defaultMode: 'auto',
    isHighRisk: false,
    validatePayload: (p) => {
      if (!p.title) return { isValid: false, error: 'title is required' };
      return { isValid: true };
    },
    execute: async (dealershipId, userId, payload) => {
      const supabase = await createClient();
      const { data: task, error } = await supabase.from('tasks').insert({
        dealership_id: dealershipId,
        title: payload.title,
        description: payload.description || '',
        due_at: payload.due_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: payload.assigned_to || userId,
        status: 'open',
        priority: payload.priority || 'medium',
        category: payload.category || 'general',
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, result: { task_id: task.id } };
    }
  },

  'appointment.create': {
    actionType: 'appointment.create',
    label: 'Schedule Customer Appointment',
    requiredPermission: 'appointments.create',
    defaultMode: 'assist',
    isHighRisk: false,
    validatePayload: (p) => {
      if (!p.title || !p.start_at) return { isValid: false, error: 'title and start_at are required' };
      return { isValid: true };
    },
    execute: async (dealershipId, userId, payload) => {
      const supabase = await createClient();
      const { data: appt, error } = await supabase.from('appointments').insert({
        dealership_id: dealershipId,
        title: payload.title,
        appointment_type: payload.appointment_type || 'viewing',
        start_at: payload.start_at,
        end_at: payload.end_at || new Date(new Date(payload.start_at).getTime() + 60 * 60 * 1000).toISOString(),
        location: payload.location || 'Dealership Showroom',
        customer_id: payload.customer_id || null,
        vehicle_id: payload.vehicle_id || null,
        assigned_to: payload.assigned_to || userId,
        status: 'scheduled',
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, result: { appointment_id: appt.id } };
    }
  },

  'pricing.prepare_change': {
    actionType: 'pricing.prepare_change',
    label: 'Prepare Pricing Review Signal',
    requiredPermission: 'pricing_signals.review',
    defaultMode: 'assist',
    isHighRisk: false,
    validatePayload: (p) => {
      if (!p.vehicle_id || !p.recommended_price) return { isValid: false, error: 'vehicle_id and recommended_price are required' };
      return { isValid: true };
    },
    execute: async (dealershipId, userId, payload) => {
      const supabase = await createClient();
      const { data: vehicle } = await supabase.from('vehicles').select('id, asking_price').eq('id', payload.vehicle_id).single();
      if (!vehicle) return { success: false, error: 'Vehicle not found' };

      const { data: signal, error } = await supabase.from('pricing_signals').insert({
        dealership_id: dealershipId,
        vehicle_id: vehicle.id,
        current_price: vehicle.asking_price,
        recommended_price: payload.recommended_price,
        recommended_change: payload.recommended_price - vehicle.asking_price,
        signal_type: payload.signal_type || 'review_price',
        priority: payload.priority || 'medium',
        reason_summary: payload.reason_summary || 'IQ automated pricing review proposal',
        status: 'active',
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, result: { signal_id: signal.id } };
    }
  },

  'vehicle.price_change': {
    actionType: 'vehicle.price_change',
    label: 'Change Vehicle Retail Asking Price',
    requiredPermission: 'stock.update_price',
    defaultMode: 'approval_required',
    isHighRisk: true, // STRICT HUMAN APPROVAL REQUIRED
    validatePayload: (p) => {
      if (!p.vehicle_id || typeof p.new_price !== 'number' || p.new_price <= 0) {
        return { isValid: false, error: 'vehicle_id and positive new_price number are required' };
      }
      return { isValid: true };
    },
    execute: async (dealershipId, userId, payload) => {
      const supabase = await createClient();
      
      // Concurrency & state re-validation check:
      const { data: vehicle } = await supabase.from('vehicles').select('id, asking_price, status').eq('id', payload.vehicle_id).eq('dealership_id', dealershipId).single();
      if (!vehicle) return { success: false, error: 'Vehicle not found in active stock' };
      
      if (vehicle.status === 'sold' || vehicle.status === 'completed') {
        return { success: false, error: 'Vehicle is already sold or completed' };
      }

      // If expected old price was supplied, verify it matches
      if (payload.expected_current_price && Math.abs(vehicle.asking_price - payload.expected_current_price) > 0.01) {
        return { success: false, error: `Vehicle price was modified since proposal (current: £${vehicle.asking_price}, expected: £${payload.expected_current_price})` };
      }

      const { error } = await supabase.from('vehicles').update({
        asking_price: payload.new_price,
        updated_at: new Date().toISOString(),
      }).eq('id', vehicle.id);

      if (error) return { success: false, error: error.message };

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'vehicle.price_changed',
        entity_type: 'vehicle',
        entity_id: vehicle.id,
        metadata: {
          previous_price: vehicle.asking_price,
          new_price: payload.new_price,
          iq_action: true,
        },
      });

      return { success: true, result: { vehicle_id: vehicle.id, new_price: payload.new_price } };
    }
  }
};

export const ActionService = {
  /**
   * Request an action. If action requires approval or dealership is in assist mode, sets status to 'awaiting_approval'.
   * If action is low-risk auto and policy allows, executes immediately.
   */
  async requestAction(dealershipId: string, userId: string, params: {
    actionType: string;
    entityType?: string;
    entityId?: string;
    inputPayload: Record<string, any>;
    recommendationId?: string;
  }): Promise<{ action: AIAction; executed: boolean; error?: string }> {
    const supabase = await createClient();

    // 1. Registry & schema validation (Deny by default)
    const def = ACTION_REGISTRY[params.actionType];
    if (!def) {
      return { action: null as any, executed: false, error: `Unregistered action type: ${params.actionType}` };
    }

    const validation = def.validatePayload(params.inputPayload);
    if (!validation.isValid) {
      return { action: null as any, executed: false, error: validation.error };
    }

    // 2. Check dealership settings & circuit breaker
    const { data: settings } = await supabase.from('dealership_iq_settings').select('*').eq('dealership_id', dealershipId).single();
    const isPaused = settings?.automation_paused ?? false;
    const policy = settings?.action_policies?.[params.actionType];
    const mode = isPaused ? 'approval_required' : (policy?.mode || def.defaultMode);

    // High risk actions ALWAYS require approval regardless of config
    const requiresApproval = def.isHighRisk || mode !== 'auto';

    // 3. Persist action record
    const { data: action, error: createError } = await supabase.from('ai_actions').insert({
      dealership_id: dealershipId,
      requested_by: userId,
      recommendation_id: params.recommendationId || null,
      action_type: params.actionType,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      input_payload: params.inputPayload,
      status: requiresApproval ? 'awaiting_approval' : 'executing',
      approval_required: requiresApproval,
    }).select().single();

    if (createError) {
      return { action: null as any, executed: false, error: createError.message };
    }

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'iq.action_requested',
      entity_type: 'ai_action',
      entity_id: action.id,
      metadata: { action_type: params.actionType, requires_approval: requiresApproval },
    });

    // 4. If auto-execution permitted, run immediately
    if (!requiresApproval) {
      const result = await def.execute(dealershipId, userId, params.inputPayload);
      if (result.success) {
        await supabase.from('ai_actions').update({
          status: 'completed',
          executed_at: new Date().toISOString(),
          result_reference: result.result,
        }).eq('id', action.id);

        await AuditService.log({
          dealership_id: dealershipId,
          user_id: userId,
          action: 'iq.action_executed',
          entity_type: 'ai_action',
          entity_id: action.id,
          metadata: { action_type: params.actionType, auto: true },
        });

        return { action: { ...action, status: 'completed' as AIActionStatus }, executed: true };
      } else {
        await supabase.from('ai_actions').update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: result.error,
        }).eq('id', action.id);

        await AuditService.log({
          dealership_id: dealershipId,
          user_id: userId,
          action: 'iq.action_failed',
          entity_type: 'ai_action',
          entity_id: action.id,
          metadata: { error: result.error },
        });

        return { action: { ...action, status: 'failed' as AIActionStatus }, executed: false, error: result.error };
      }
    }

    return { action, executed: false };
  },

  /**
   * Human approval and domain execution of a pending AI action.
   */
  async approveAction(dealershipId: string, userId: string, actionId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: action } = await supabase.from('ai_actions').select('*').eq('id', actionId).eq('dealership_id', dealershipId).single();
    if (!action) return { success: false, error: 'Action not found' };

    if (action.status !== 'awaiting_approval' && action.status !== 'draft') {
      return { success: false, error: `Action cannot be approved from status: ${action.status}` };
    }

    const def = ACTION_REGISTRY[action.action_type];
    if (!def) return { success: false, error: 'Unknown action type definition' };

    // Execute canonical domain service
    const execution = await def.execute(dealershipId, userId, action.input_payload);

    if (execution.success) {
      await supabase.from('ai_actions').update({
        status: 'completed',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        result_reference: execution.result,
      }).eq('id', actionId);

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'iq.action_approved',
        entity_type: 'ai_action',
        entity_id: actionId,
        metadata: { action_type: action.action_type },
      });

      return { success: true };
    } else {
      await supabase.from('ai_actions').update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: execution.error,
      }).eq('id', actionId);

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'iq.action_failed',
        entity_type: 'ai_action',
        entity_id: actionId,
        metadata: { error: execution.error },
      });

      return { success: false, error: execution.error };
    }
  },

  /**
   * Rejects/dismisses a pending action.
   */
  async rejectAction(dealershipId: string, userId: string, actionId: string, reason?: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    await supabase.from('ai_actions').update({
      status: 'rejected',
      failure_reason: reason || 'Rejected by user',
    }).eq('id', actionId).eq('dealership_id', dealershipId);

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'iq.action_rejected',
      entity_type: 'ai_action',
      entity_id: actionId,
      metadata: { reason },
    });

    return { success: true };
  },

  /**
   * Get pending actions for approval inbox.
   */
  async getPendingActions(dealershipId: string): Promise<AIAction[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('ai_actions')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('status', 'awaiting_approval')
      .order('created_at', { ascending: false });

    return (data || []) as AIAction[];
  }
};
