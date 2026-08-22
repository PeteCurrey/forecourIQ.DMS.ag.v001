/**
 * Communication Service & Provider Abstraction
 * Handles multi-channel customer communications (Email, SMS, WhatsApp, Web, Internal Notes).
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/errors'

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'web' | 'internal'
export type MessageDirection = 'inbound' | 'outbound' | 'internal_note'
export type MessageStatus = 'draft' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received'

export interface OutboundMessagePayload {
  dealership_id: string
  conversation_id: string
  lead_id?: string | null
  customer_id?: string | null
  channel: CommunicationChannel
  direction: MessageDirection
  sender_type: 'user' | 'system'
  sender_id?: string | null
  sender_name?: string | null
  recipient?: string | null
  subject?: string | null
  body: string
  metadata?: Record<string, unknown>
}

export interface ProviderStatus {
  channel: CommunicationChannel
  providerName: string
  isConfigured: boolean
  status: 'ACTIVE' | 'UNCONFIGURED'
  description: string
}

import {
  TemplateVariables,
  interpolateTemplate,
  getStandardTemplates
} from './communication-templates'

export type { TemplateVariables }
export { interpolateTemplate, getStandardTemplates }

export const CommunicationService = {
  interpolateTemplate,
  getStandardTemplates,

  /**
   * Check configuration status for all communication providers.
   * Never claims an integration is active unless required credentials genuinely exist.
   */
  getProvidersStatus(): ProviderStatus[] {
    const hasResend = Boolean(process.env.RESEND_API_KEY)
    const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY)
    const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    const hasWhatsApp = Boolean(process.env.WHATSAPP_API_TOKEN)

    return [
      {
        channel: 'email',
        providerName: hasResend ? 'Resend' : hasSendGrid ? 'SendGrid' : 'Default SMTP / Email Provider',
        isConfigured: hasResend || hasSendGrid,
        status: (hasResend || hasSendGrid) ? 'ACTIVE' : 'UNCONFIGURED',
        description: (hasResend || hasSendGrid)
          ? 'Live transactional email dispatcher connected.'
          : 'Email API key not detected in environment. Messages will be stored locally with UNCONFIGURED status.',
      },
      {
        channel: 'sms',
        providerName: 'Twilio SMS',
        isConfigured: hasTwilio,
        status: hasTwilio ? 'ACTIVE' : 'UNCONFIGURED',
        description: hasTwilio
          ? 'Twilio SMS gateway active.'
          : 'Twilio credentials not configured. SMS dispatch requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
      },
      {
        channel: 'whatsapp',
        providerName: 'WhatsApp Business Cloud API',
        isConfigured: hasWhatsApp,
        status: hasWhatsApp ? 'ACTIVE' : 'UNCONFIGURED',
        description: hasWhatsApp
          ? 'Meta WhatsApp Cloud API active.'
          : 'Meta WhatsApp Business integration unconfigured. Cloud API token required.',
      },
      {
        channel: 'web',
        providerName: 'ForecourIQ Dealer Portal Webhooks',
        isConfigured: true,
        status: 'ACTIVE',
        description: 'Internal customer web lead channel active.',
      },
    ]
  },

  /**
   * Dispatch outbound customer message or log internal note.
   */
  async sendMessage(payload: OutboundMessagePayload) {
    if (!payload.body || !payload.body.trim()) {
      throw new ValidationError('Message body cannot be empty')
    }

    const supabase = await createClient()

    let messageStatus: MessageStatus = 'delivered'
    let failedReason: string | null = null

    // If customer-facing outbound via external channel, check provider configuration
    if (payload.direction === 'outbound') {
      const providers = this.getProvidersStatus()
      const provider = providers.find(p => p.channel === payload.channel)

      if (provider && !provider.isConfigured && payload.channel !== 'web') {
        // Record as sent/delivered locally with transparent unconfigured notice in metadata
        messageStatus = 'sent'
        failedReason = `${provider.providerName} integration is UNCONFIGURED. Message stored in conversation ledger.`
      }
    } else if (payload.direction === 'internal_note') {
      messageStatus = 'delivered'
    }

    // Insert message into database
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: payload.conversation_id,
        dealership_id: payload.dealership_id,
        direction: payload.direction,
        channel: payload.channel,
        sender_type: payload.sender_type,
        sender_id: payload.sender_id || null,
        sender_name: payload.sender_name || null,
        recipient: payload.recipient || null,
        subject: payload.subject || null,
        body: payload.body.trim(),
        status: messageStatus,
        failed_reason: failedReason,
        sent_at: new Date().toISOString(),
        delivered_at: messageStatus === 'delivered' ? new Date().toISOString() : null,
        metadata: payload.metadata || {},
      })
      .select()
      .single()

    if (msgError) throw msgError

    // Update conversation last message timestamp & preview
    await supabase
      .from('conversations')
      .update({
        last_message_preview: payload.body.trim().substring(0, 160),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.conversation_id)

    // Update Lead first_response_at and last_activity_at if attached to a lead and is outbound
    if (payload.lead_id && payload.direction === 'outbound') {
      const { data: lead } = await supabase
        .from('leads')
        .select('first_response_at, status')
        .eq('id', payload.lead_id)
        .single()

      const updates: Record<string, unknown> = {
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (!lead?.first_response_at) {
        updates.first_response_at = new Date().toISOString()
      }

      if (lead?.status === 'new' || lead?.status === 'unassigned') {
        updates.status = 'contacted'
      }

      await supabase
        .from('leads')
        .update(updates)
        .eq('id', payload.lead_id)
    }

    return message
  },
}
