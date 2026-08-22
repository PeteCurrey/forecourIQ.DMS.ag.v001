/**
 * Server-side environment configuration with startup and runtime validation.
 *
 * REQUIRED variables are checked at runtime when actions execute.
 * OPTIONAL variables log their status without blocking execution.
 *
 * Never import this file in client-side code.
 * Never pass these values to the browser.
 */

export type IntegrationStatus = 'available' | 'unconfigured' | 'not_yet_implemented'

function getEnv(key: string, defaultValue = ''): string {
  return process.env[key] || defaultValue
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined
}

function integrationStatus(key: string): IntegrationStatus {
  return process.env[key] ? 'available' : 'unconfigured'
}

/**
 * Validate that a required environment variable is set at runtime.
 */
export function requireRuntimeEnv(key: string): string {
  const val = process.env[key]
  if (!val) {
    throw new Error(
      `[ForecourIQ] Missing required environment variable at runtime: ${key}\n` +
      `Ensure this secret is populated in .env.local or your deployment environment.`
    )
  }
  return val
}

// ─── SUPABASE (REQUIRED) ────────────────────────────────────────────────────

export const supabaseConfig = {
  get url() { return getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder.supabase.co') },
  get anonKey() { return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-anon-key') },
  get serviceRoleKey() { return getEnv('SUPABASE_SERVICE_ROLE_KEY', 'placeholder-service-key') },
  get isConfigured() {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}

// ─── STRIPE (REQUIRED) ──────────────────────────────────────────────────────

export const stripeConfig = {
  get secretKey() { return getEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder') },
  get webhookSecret() { return getEnv('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder') },
  get publishableKey() { return getEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_placeholder') },
  prices: {
    get starter() { return optionalEnv('STRIPE_PRICE_STARTER') },
    get professional() { return optionalEnv('STRIPE_PRICE_PROFESSIONAL') },
    get elite() { return optionalEnv('STRIPE_PRICE_ELITE') },
  },
  get isConfigured() {
    return !!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder')
  }
}

// ─── APP URLS (REQUIRED) ────────────────────────────────────────────────────

export const appConfig = {
  get appUrl() { return getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') },
  get marketingUrl() { return getEnv('NEXT_PUBLIC_MARKETING_URL', 'http://localhost:3000') },
}

// ─── AI / ANTHROPIC ─────────────────────────────────────────────────────────

export const anthropicConfig = {
  get apiKey() { return optionalEnv('ANTHROPIC_API_KEY') },
  get status() { return integrationStatus('ANTHROPIC_API_KEY') },
  get isConfigured() { return !!process.env.ANTHROPIC_API_KEY }
}

// ─── INTEGRATIONS ──────────────────────────────────────────────────────────

export const integrationConfig = {
  dvla: {
    get apiKey() { return optionalEnv('DVLA_API_KEY') },
    status: 'not_yet_implemented' as IntegrationStatus,
  },
  autotrader: {
    get apiKey() { return optionalEnv('AUTOTRADER_API_KEY') },
    get status() { return integrationStatus('AUTOTRADER_API_KEY') },
  },
  capHpi: {
    get apiKey() { return optionalEnv('CAP_HPI_API_KEY') },
    status: 'not_yet_implemented' as IntegrationStatus,
  },
  xero: {
    get clientId() { return optionalEnv('XERO_CLIENT_ID') },
    get status() { return integrationStatus('XERO_CLIENT_ID') },
  },
  sendgrid: {
    get apiKey() { return optionalEnv('SENDGRID_API_KEY') },
    get status() { return integrationStatus('SENDGRID_API_KEY') },
  },
  twilio: {
    get accountSid() { return optionalEnv('TWILIO_ACCOUNT_SID') },
    get status() { return integrationStatus('TWILIO_ACCOUNT_SID') },
  },
}

// ─── OBSERVABILITY ──────────────────────────────────────────────────────────

export const observabilityConfig = {
  get sentryDsn() { return optionalEnv('SENTRY_DSN') },
  get status() { return integrationStatus('SENTRY_DSN') },
}
