import { createClient } from '@/lib/supabase/server'

/**
 * Audit action types — extend as new domains are added.
 * Format: <domain>.<action>
 */
export type AuditAction =
  // Vehicles
  | 'vehicle.created'
  | 'vehicle.updated'
  | 'vehicle.price_changed'
  | 'vehicle.status_changed'
  | 'vehicle.sold'
  | 'vehicle.deleted'
  | 'vehicle.image_uploaded'
  | 'vehicle.image_deleted'
  // Customers
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  // Leads & CRM
  | 'lead.created'
  | 'lead.assigned'
  | 'lead.status_changed'
  | 'lead.won'
  | 'lead.lost'
  | 'call.logged'
  | 'message.sent'
  | 'message.failed'
  // Deals
  | 'deal.created'
  | 'deal.updated'
  | 'deal.discount_changed'
  | 'deal.status_changed'
  | 'deal.completed'
  | 'deal.cancelled'
  | 'deal.lost'
  | 'proposal.created'
  | 'proposal.accepted'
  | 'proposal.rejected'
  | 'proposal.superseded'
  | 'discount.requested'
  | 'discount.approved'
  | 'discount.rejected'
  | 'part_exchange.created'
  | 'part_exchange.valued'
  | 'part_exchange.settlement_updated'
  | 'part_exchange.acquired'
  | 'reservation.created'
  | 'reservation.cancelled'
  | 'reservation.converted'
  | 'payment.created'
  | 'payment.verified'
  | 'payment.refunded'
  | 'payment.failed'
  | 'finance.created'
  | 'finance.status_changed'
  | 'handover.scheduled'
  | 'handover.completed'
  | 'invoice.generated'
  | 'document.generated'
  // Users
  | 'user.role_changed'
  | 'user.deactivated'
  | 'user.invited'
  // Dealership
  | 'dealership.updated'
  | 'dealership.settings_changed'
  // Integrations
  | 'integration.connected'
  | 'integration.disconnected'
  | 'integration.credentials_updated'
  | 'integration.sync_triggered'
  | 'vehicle.lookup_completed'
  | 'valuation.retrieved'
  | 'listing.published'
  | 'listing.updated'
  | 'listing.withdrawn'
  | 'listing.failed'
  | 'accounting.invoice_synced'
  | 'accounting.sync_failed'
  // Website
  | 'website.config_updated'
  | 'website.published'
  | 'website.domain_added'
  | 'website.domain_removed'
  | 'website.page_created'
  | 'website.page_updated'
  | 'website.page_deleted'
  | 'website.redirect_created'
  | 'website.redirect_deleted'
  // Intelligence
  | 'intelligence.run_executed'
  | 'intelligence.settings_changed'
  | 'buying_signal.generated'
  | 'buying_signal.accepted'
  | 'buying_signal.dismissed'
  | 'buying_signal.converted'
  | 'watchlist.created'
  | 'watchlist.updated'
  | 'pricing_signal.generated'
  | 'pricing_signal.applied'
  | 'pricing_signal.dismissed'
  | 'competitor.created'
  | 'competitor.updated'
  | 'competitor.deleted'
  // AI & IQ Operating Layer
  | 'ai.recommendation_accepted'
  | 'ai.recommendation_dismissed'
  | 'ai.action_executed'
  | 'iq.question_asked'
  | 'iq.brief_generated'
  | 'iq.recommendation_created'
  | 'iq.recommendation_accepted'
  | 'iq.recommendation_dismissed'
  | 'iq.action_requested'
  | 'iq.action_approved'
  | 'iq.action_rejected'
  | 'iq.action_executed'
  | 'iq.action_failed'
  | 'iq.automation_enabled'
  | 'iq.automation_disabled'
  | 'iq.automation_paused'
  // Billing
  | 'billing.subscription_changed'
  | 'billing.payment_failed'
  // Compliance
  | 'compliance.document_generated'
  | 'compliance.document_signed'

export interface AuditEntry {
  dealership_id: string
  user_id?: string
  action: AuditAction
  entity_type?: string
  entity_id?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  source?: 'web' | 'api' | 'webhook' | 'system' | 'ai'
}

/**
 * AuditService — records important operational changes to the audit_log table.
 */
export const AuditService = {
  async log(entry: AuditEntry): Promise<void> {
    try {
      const supabase = await createClient()
      const { error } = await supabase.from('audit_log').insert({
        dealership_id: entry.dealership_id,
        user_id: entry.user_id ?? null,
        action: entry.action,
        entity_type: entry.entity_type ?? null,
        entity_id: entry.entity_id ?? null,
        before_state: entry.before ?? null,
        after_state: entry.after ?? null,
        metadata: entry.metadata ?? null,
        source: entry.source ?? 'web',
        created_at: new Date().toISOString(),
      })
      if (error) {
        console.error('[AuditService] Failed to write audit log:', error.message)
      }
    } catch (err) {
      console.error('[AuditService] Unexpected error:', err)
    }
  },

  async logAI(
    dealershipId: string,
    userId: string,
    action: Extract<AuditAction, `ai.${string}`>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action,
      entity_type: 'ai',
      metadata,
      source: 'ai',
    })
  },
}
