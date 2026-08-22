/**
 * ForecourIQ Integration Registry
 *
 * Central definition of all integrations, their categories, and current status.
 * UI components must read from this registry — never hardcode integration states.
 *
 * Status meanings:
 *   available            — Credentials configured and connection verified
 *   connected            — Active connection with a specific dealership account
 *   disconnected         — Previously connected, now disconnected
 *   error                — Connection error, intervention required
 *   credentials_required — Integration supported but no credentials provided
 *   commercial_agreement_required — Integration requires a commercial contract
 *   not_available        — Integration not available in this plan/region
 *   not_yet_implemented  — Planned but not yet built
 */

export type IntegrationStatus =
  | 'available'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'credentials_required'
  | 'commercial_agreement_required'
  | 'not_available'
  | 'not_yet_implemented'

export type IntegrationCategory =
  | 'vehicle_data'
  | 'advertising'
  | 'finance'
  | 'accounting'
  | 'communications'
  | 'acquisition'
  | 'compliance'
  | 'monitoring'

export interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  description: string
  status: IntegrationStatus
  statusMessage?: string
  docsUrl?: string
}

export const INTEGRATIONS: Integration[] = [
  // ─── VEHICLE DATA ──────────────────────────────────────────────────────────
  {
    id: 'dvla',
    name: 'DVLA',
    category: 'vehicle_data',
    description: 'Vehicle registration lookups and MOT history via the DVLA Vehicle Enquiry Service.',
    status: 'commercial_agreement_required',
    statusMessage: 'Requires a DVLA data access agreement.',
  },
  {
    id: 'cap_hpi',
    name: 'CAP HPI',
    category: 'vehicle_data',
    description: 'Vehicle valuations, finance checks, and market data.',
    status: 'not_yet_implemented',
  },

  // ─── ADVERTISING ───────────────────────────────────────────────────────────
  {
    id: 'autotrader',
    name: 'AutoTrader',
    category: 'advertising',
    description: 'Publish stock listings to AutoTrader and receive lead data.',
    status: process.env.AUTOTRADER_API_KEY ? 'credentials_required' : 'not_yet_implemented',
  },
  {
    id: 'motors',
    name: 'Motors.co.uk',
    category: 'advertising',
    description: 'Publish stock listings to Motors.co.uk.',
    status: 'not_yet_implemented',
  },
  {
    id: 'cargurus',
    name: 'CarGurus',
    category: 'advertising',
    description: 'Publish stock listings to CarGurus.',
    status: 'not_yet_implemented',
  },
  {
    id: 'ebay_motors',
    name: 'eBay Motors',
    category: 'advertising',
    description: 'Publish stock listings to eBay Motors.',
    status: 'not_yet_implemented',
  },
  {
    id: 'pistonheads',
    name: 'PistonHeads',
    category: 'advertising',
    description: 'Publish stock listings to PistonHeads.',
    status: 'not_yet_implemented',
  },

  // ─── FINANCE ───────────────────────────────────────────────────────────────
  {
    id: 'codeweavers',
    name: 'Codeweavers',
    category: 'finance',
    description: 'Finance calculation and proposal tools.',
    status: 'not_yet_implemented',
  },
  {
    id: 'ivendi',
    name: 'iVendi',
    category: 'finance',
    description: 'Online finance and FCA compliance tools.',
    status: 'not_yet_implemented',
  },

  // ─── ACCOUNTING ────────────────────────────────────────────────────────────
  {
    id: 'xero',
    name: 'Xero',
    category: 'accounting',
    description: 'Export sales invoices and purchase records to Xero.',
    status: process.env.XERO_CLIENT_ID ? 'credentials_required' : 'not_yet_implemented',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'accounting',
    description: 'Export accounting data to QuickBooks.',
    status: 'not_yet_implemented',
  },
  {
    id: 'sage',
    name: 'Sage',
    category: 'accounting',
    description: 'Export accounting data to Sage.',
    status: 'not_yet_implemented',
  },

  // ─── COMMUNICATIONS ────────────────────────────────────────────────────────
  {
    id: 'email',
    name: 'Email (SendGrid)',
    category: 'communications',
    description: 'Transactional email for lead notifications and customer communications.',
    status: process.env.SENDGRID_API_KEY ? 'credentials_required' : 'not_yet_implemented',
  },
  {
    id: 'sms',
    name: 'SMS (Twilio)',
    category: 'communications',
    description: 'SMS notifications and customer messaging.',
    status: process.env.TWILIO_ACCOUNT_SID ? 'credentials_required' : 'not_yet_implemented',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'communications',
    description: 'WhatsApp messaging for customer engagement.',
    status: 'not_yet_implemented',
  },

  // ─── ACQUISITION ───────────────────────────────────────────────────────────
  {
    id: 'bca',
    name: 'BCA',
    category: 'acquisition',
    description: 'BCA auction integration for vehicle sourcing.',
    status: 'commercial_agreement_required',
  },
  {
    id: 'manheim',
    name: 'Manheim',
    category: 'acquisition',
    description: 'Manheim auction integration for vehicle sourcing.',
    status: 'commercial_agreement_required',
  },

  // ─── MONITORING ────────────────────────────────────────────────────────────
  {
    id: 'sentry',
    name: 'Sentry',
    category: 'monitoring',
    description: 'Error and performance monitoring.',
    status: process.env.SENTRY_DSN ? 'connected' : 'credentials_required',
  },
]

export function getIntegrationById(id: string): Integration | undefined {
  return INTEGRATIONS.find(i => i.id === id)
}

export function getIntegrationsByCategory(category: IntegrationCategory): Integration[] {
  return INTEGRATIONS.filter(i => i.category === category)
}

export function isIntegrationAvailable(id: string): boolean {
  const integration = getIntegrationById(id)
  return integration?.status === 'available' || integration?.status === 'connected'
}
