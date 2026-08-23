/**
 * ForecourIQ DMS — Canonical Integration Registry
 *
 * Defines all supported automotive services, advertising portals, finance providers,
 * accounting platforms, communications channels, and e-sign gateways.
 *
 * PRINCIPLE: No Fake Integrations.
 * UI components must consume this registry — never hardcode mock integration states.
 * Safe for client-side and server-side imports (pure data structures).
 */

export type IntegrationCategory =
  | 'vehicle_data'
  | 'valuation'
  | 'advertising'
  | 'finance'
  | 'accounting'
  | 'communications'
  | 'payments'
  | 'esignature'
  | 'identity'
  | 'acquisition'
  | 'monitoring'

export type IntegrationConnectionStatus =
  | 'available'
  | 'not_configured'
  | 'credentials_required'
  | 'commercial_access_required'
  | 'pending_connection'
  | 'connected'
  | 'degraded'
  | 'error'
  | 'disabled'
  | 'unsupported'

export type IntegrationHealth =
  | 'healthy'
  | 'warning'
  | 'degraded'
  | 'failed'
  | 'unknown'

export type AuthType = 'api_key' | 'oauth2' | 'credentials' | 'webhook_only' | 'none'

export interface IntegrationProviderDefinition {
  id: string
  name: string
  category: IntegrationCategory
  categoryLabel: string
  description: string
  authType: AuthType
  supportsWebhooks: boolean
  supportsOAuth: boolean
  supportsApiKey: boolean
  requiredFields: string[]
  documentationUrl?: string
  commercialRequirement?: string
  setupGuide?: string
}

export interface DealershipIntegrationState {
  providerId: string
  status: IntegrationConnectionStatus
  health: IntegrationHealth
  metadata?: Record<string, unknown>
  settings?: Record<string, unknown>
  lastSyncAt?: string | null
  lastSuccessAt?: string | null
  lastErrorAt?: string | null
  lastErrorMessage?: string | null
  connectedAt?: string | null
}

export interface DealershipIntegrationWithMeta extends IntegrationProviderDefinition {
  state: DealershipIntegrationState
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  vehicle_data: 'Vehicle Identity & Specification',
  valuation: 'Valuations & Market Pricing',
  advertising: 'Advertising & Portal Feeds',
  finance: 'Finance & Point of Sale',
  accounting: 'Accounting & Ledger Sync',
  communications: 'Omnichannel Communications',
  payments: 'Payment Processing',
  esignature: 'E-Signatures & Document Signing',
  identity: 'Identity Verification & KYC',
  acquisition: 'Wholesale & Auction Feeds',
  monitoring: 'System Health & Monitoring',
}

export const PROVIDER_DEFINITIONS: IntegrationProviderDefinition[] = [
  // ─── VEHICLE DATA & VALUATIONS ─────────────────────────────────────────────
  {
    id: 'dvla',
    name: 'DVLA Vehicle Enquiry Service',
    category: 'vehicle_data',
    categoryLabel: 'Vehicle Identity & Specification',
    description: 'Official UK registration lookups, tax class, MOT status, and basic technical specs.',
    authType: 'api_key',
    supportsWebhooks: false,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['api_key'],
    commercialRequirement: 'Requires DVLA Vehicle Enquiry Service (VES) API Key registration.',
    setupGuide: 'Apply for an official DVLA API key via the UK Government Developer Portal and enter your key in settings.',
  },
  {
    id: 'cap_hpi',
    name: 'CAP HPI Valuations & Provenance',
    category: 'vehicle_data',
    categoryLabel: 'Vehicle Identity & Specification',
    description: 'Live trade and retail valuations, mileage anomaly flags, write-off markers, and outstanding finance checks.',
    authType: 'credentials',
    supportsWebhooks: false,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['api_key', 'account_id'],
    commercialRequirement: 'Requires active commercial contract with Solera CAP HPI.',
    setupGuide: 'Provide your CAP HPI subscriber credentials to enable automated valuation snapshots and provenance history.',
  },

  // ─── ADVERTISING PORTALS ───────────────────────────────────────────────────
  {
    id: 'autotrader',
    name: 'AutoTrader Connect',
    category: 'advertising',
    categoryLabel: 'Advertising & Portal Feeds',
    description: 'Direct bi-directional AutoTrader Connect integration: instant stock publishing, real-time price updates, and lead ingestion.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['advertiser_id', 'api_key'],
    commercialRequirement: 'Requires an AutoTrader dealer account with AutoTrader Connect API access enabled.',
    setupGuide: 'Obtain your AutoTrader Connect API key from your AutoTrader account manager and configure your 7-digit Advertiser ID.',
  },
  {
    id: 'motors',
    name: 'Motors.co.uk Feed',
    category: 'advertising',
    categoryLabel: 'Advertising & Portal Feeds',
    description: 'Automated stock feed publishing and lead routing to Motors.co.uk classified network.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['dealer_id', 'api_key'],
    commercialRequirement: 'Requires active Motors.co.uk dealer subscription.',
    setupGuide: 'Enter your Motors Dealer ID to syndicate stock directly.',
  },
  {
    id: 'cargurus',
    name: 'CarGurus UK',
    category: 'advertising',
    categoryLabel: 'Advertising & Portal Feeds',
    description: 'Automated inventory feeds, CarGurus Deal Rating synchronization, and buyer lead ingestion.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['dealer_id', 'api_key'],
    commercialRequirement: 'Requires CarGurus dealer listing package.',
    setupGuide: 'Provide your CarGurus Dealer ID to enable inventory feed dispatch.',
  },
  {
    id: 'ebay_motors',
    name: 'eBay Motors Pro',
    category: 'advertising',
    categoryLabel: 'Advertising & Portal Feeds',
    description: 'eBay Motors Pro inventory feed sync, classified listing creation, and classified lead capture.',
    authType: 'oauth2',
    supportsWebhooks: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiredFields: ['store_id', 'client_id', 'client_secret'],
    commercialRequirement: 'Requires eBay Motors Pro subscription.',
    setupGuide: 'Authorize ForecourIQ with your eBay Motors store credentials.',
  },
  {
    id: 'pistonheads',
    name: 'PistonHeads Classifieds',
    category: 'advertising',
    categoryLabel: 'Advertising & Portal Feeds',
    description: 'Enthusiast classified feed syndication and buyer message capture.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['dealer_id', 'api_key'],
    commercialRequirement: 'Requires PistonHeads trade advertising account.',
    setupGuide: 'Enter your PistonHeads Trade Account ID.',
  },

  // ─── COMMUNICATIONS ────────────────────────────────────────────────────────
  {
    id: 'sendgrid',
    name: 'SendGrid Email',
    category: 'communications',
    categoryLabel: 'Omnichannel Communications',
    description: 'Transactional email infrastructure for customer order confirmations, receipts, and CRM replies.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['api_key', 'sender_email'],
    commercialRequirement: 'Requires Twilio SendGrid account with verified sending domain.',
    setupGuide: 'Enter your SendGrid API key and verified dealership sender address.',
  },
  {
    id: 'resend',
    name: 'Resend Email',
    category: 'communications',
    categoryLabel: 'Omnichannel Communications',
    description: 'Modern transactional email infrastructure for dealer messaging and notification dispatch.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['api_key', 'sender_email'],
    commercialRequirement: 'Requires Resend account with verified sending domain.',
    setupGuide: 'Provide your Resend API Key to send transactional emails.',
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    category: 'communications',
    categoryLabel: 'Omnichannel Communications',
    description: 'SMS notifications, appointment reminders, and two-way CRM customer text messaging.',
    authType: 'credentials',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['account_sid', 'auth_token', 'phone_number'],
    commercialRequirement: 'Requires Twilio account with an active UK SMS-capable phone number.',
    setupGuide: 'Enter your Twilio Account SID, Auth Token, and designated sender number.',
  },
  {
    id: 'whatsapp',
    name: 'Meta WhatsApp Business API',
    category: 'communications',
    categoryLabel: 'Omnichannel Communications',
    description: 'Official WhatsApp Cloud API for conversational vehicle enquiries and customer updates.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['phone_number_id', 'api_token', 'business_account_id'],
    commercialRequirement: 'Requires approved Meta Business Manager and WhatsApp Business Account (WABA).',
    setupGuide: 'Configure your WhatsApp Cloud API credentials and verified business phone number.',
  },

  // ─── FINANCE SYSTEMS ───────────────────────────────────────────────────────
  {
    id: 'codeweavers',
    name: 'Codeweavers Finance Platform',
    category: 'finance',
    categoryLabel: 'Finance & Point of Sale',
    description: 'Integrated finance quoting, showroom calculator widgets, and multi-lender proposal routing.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['api_key', 'dealer_reference'],
    commercialRequirement: 'Requires active Codeweavers showroom integration agreement.',
    setupGuide: 'Enter your Codeweavers System API Key and dealership reference code.',
  },
  {
    id: 'ivendi',
    name: 'iVendi Point of Sale',
    category: 'finance',
    categoryLabel: 'Finance & Point of Sale',
    description: 'Online finance quoting, lender eligibility checks, and customer application portal.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['partner_id', 'api_key'],
    commercialRequirement: 'Requires iVendi trade partner credentials.',
    setupGuide: 'Enter your iVendi Partner ID and API credentials.',
  },
  {
    id: 'evolution',
    name: 'Evolution Funding',
    category: 'finance',
    categoryLabel: 'Finance & Point of Sale',
    description: 'Direct broker proposal submission, document tracking, and real-time payout status.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['dealer_code', 'api_key'],
    commercialRequirement: 'Requires an active introducer agreement with Evolution Funding Ltd.',
    setupGuide: 'Enter your Evolution dealer introducer code and API access key.',
  },

  // ─── ACCOUNTING ────────────────────────────────────────────────────────────
  {
    id: 'xero',
    name: 'Xero Accounting',
    category: 'accounting',
    categoryLabel: 'Accounting & Ledger Sync',
    description: 'Direct sync of vehicle sales invoices, acquisition costs, VAT margin scheme journals, and customer records.',
    authType: 'oauth2',
    supportsWebhooks: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiredFields: ['client_id', 'client_secret'],
    commercialRequirement: 'Requires an active Xero organisation subscription.',
    setupGuide: 'Click Connect to authorize ForecourIQ via OAuth2 and map your Chart of Accounts.',
  },
  {
    id: 'quickbooks',
    name: 'Intuit QuickBooks Online',
    category: 'accounting',
    categoryLabel: 'Accounting & Ledger Sync',
    description: 'Export sales invoices, vehicle purchase bills, and deposit payments to QuickBooks Online.',
    authType: 'oauth2',
    supportsWebhooks: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiredFields: ['client_id', 'client_secret'],
    commercialRequirement: 'Requires QuickBooks Online subscription.',
    setupGuide: 'Authorize via QuickBooks OAuth2 connection.',
  },
  {
    id: 'sage',
    name: 'Sage Business Cloud',
    category: 'accounting',
    categoryLabel: 'Accounting & Ledger Sync',
    description: 'Commercial accounting and vehicle margin scheme transaction export to Sage.',
    authType: 'oauth2',
    supportsWebhooks: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiredFields: ['client_id', 'client_secret'],
    commercialRequirement: 'Requires Sage Business Cloud subscription.',
    setupGuide: 'Authorize via Sage OAuth2 connection.',
  },

  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'payments',
    categoryLabel: 'Payment Processing',
    description: 'Direct debit/credit card processing, holding deposit checkout links, and verified payment webhooks.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['secret_key', 'publishable_key', 'webhook_secret'],
    commercialRequirement: 'Requires a verified Stripe account.',
    setupGuide: 'Configure your Stripe API keys in your environment settings.',
  },

  // ─── E-SIGNATURE & IDENTITY ────────────────────────────────────────────────
  {
    id: 'docusign',
    name: 'DocuSign E-Signature',
    category: 'esignature',
    categoryLabel: 'E-Signatures & Document Signing',
    description: 'Digital signature requests for vehicle order forms, finance agreements, and delivery handover receipts.',
    authType: 'oauth2',
    supportsWebhooks: true,
    supportsOAuth: true,
    supportsApiKey: false,
    requiredFields: ['account_id', 'client_id', 'client_secret'],
    commercialRequirement: 'Requires DocuSign Business or Developer account.',
    setupGuide: 'Authorize ForecourIQ with your DocuSign OAuth2 app credentials.',
  },
  {
    id: 'veriff',
    name: 'Veriff Identity Verification',
    category: 'identity',
    categoryLabel: 'Identity Verification & KYC',
    description: 'Automated biometric and identity document verification for remote vehicle buyers.',
    authType: 'api_key',
    supportsWebhooks: true,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['api_key', 'api_secret'],
    commercialRequirement: 'Requires Veriff commercial agreement.',
    setupGuide: 'Enter your Veriff API credentials to enable customer verification links.',
  },

  // ─── SOURCING & AUCTIONS ───────────────────────────────────────────────────
  {
    id: 'bca',
    name: 'BCA Wholesale Auctions',
    category: 'acquisition',
    categoryLabel: 'Wholesale & Auction Feeds',
    description: 'Wholesale inventory sourcing, auction catalogue search, and direct vehicle acquisition import.',
    authType: 'credentials',
    supportsWebhooks: false,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['account_id', 'api_key'],
    commercialRequirement: 'Requires commercial BCA Dealer Pro account and API authorization.',
    setupGuide: 'Enter your BCA dealer credentials to enable auction catalog sourcing.',
  },
  {
    id: 'manheim',
    name: 'Manheim (Cox Automotive)',
    category: 'acquisition',
    categoryLabel: 'Wholesale & Auction Feeds',
    description: 'Cox Automotive wholesale purchase imports and landed cost ledger synchronization.',
    authType: 'credentials',
    supportsWebhooks: false,
    supportsOAuth: false,
    supportsApiKey: true,
    requiredFields: ['account_id', 'api_key'],
    commercialRequirement: 'Requires Manheim commercial trade account.',
    setupGuide: 'Provide your Cox Automotive / Manheim API access credentials.',
  },
]

export function getProviderById(id: string): IntegrationProviderDefinition | undefined {
  return PROVIDER_DEFINITIONS.find((p) => p.id === id)
}

export function getProvidersByCategory(category: IntegrationCategory): IntegrationProviderDefinition[] {
  return PROVIDER_DEFINITIONS.filter((p) => p.category === category)
}

export function getCategoriesWithProviders(): { category: IntegrationCategory; label: string; providers: IntegrationProviderDefinition[] }[] {
  const categories: IntegrationCategory[] = [
    'vehicle_data',
    'advertising',
    'communications',
    'finance',
    'accounting',
    'payments',
    'esignature',
    'identity',
    'acquisition',
  ]

  return categories.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    providers: getProvidersByCategory(category),
  }))
}
