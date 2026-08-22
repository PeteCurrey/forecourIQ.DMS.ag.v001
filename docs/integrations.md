# ForecourtIQ DMS — Integrations Architecture

## 1. Integration Framework

ForecourtIQ DMS uses a central integration registry located at `lib/integrations/registry.ts`. External third-party integrations are strictly classified by their operational status:

- `available`: Provider configured, verified, and operational.
- `connected`: Active authentication with a specific dealership account.
- `credentials_required`: Code is in place, but API credentials must be configured in environment or settings.
- `commercial_agreement_required`: Requires a commercial contract with third-party supplier (e.g., DVLA, BCA).
- `not_yet_implemented`: Planned for subsequent ForecourtIQ build phases.
- `disconnected` / `error`: Connection suspended or encountered an error.

## 2. Integration Status Overview

| Integration | Category | Phase 0 Status | Description |
|---|---|---|---|
| **Stripe** | Billing | `available` | Subscription management & webhooks |
| **Anthropic Claude** | AI Engine | `available` (if `ANTHROPIC_API_KEY` present) | IQ Ask, IQ Recommend, IQ Create |
| **Supabase Storage** | Storage | `available` | Vehicle photos & documents |
| **DVLA Vehicle Enquiry** | Vehicle Data | `commercial_agreement_required` | Reg lookup & MOT history |
| **CAP HPI** | Vehicle Data | `not_yet_implemented` | Valuations and provenance |
| **AutoTrader** | Advertising | `credentials_required` / `not_yet_implemented` | Portal publishing & lead sync |
| **Motors.co.uk** | Advertising | `not_yet_implemented` | Portal publishing |
| **CarGurus** | Advertising | `not_yet_implemented` | Portal publishing |
| **eBay Motors** | Advertising | `not_yet_implemented` | Portal publishing |
| **Codeweavers** | Finance | `not_yet_implemented` | Finance calculations & proposals |
| **iVendi** | Finance | `not_yet_implemented` | Finance quotes & compliance |
| **Xero / QuickBooks** | Accounting | `credentials_required` / `not_yet_implemented` | Sales invoice syncing |
| **SendGrid / Twilio** | Communications | `credentials_required` / `not_yet_implemented` | Email & SMS notifications |
| **Sentry** | Observability | `connected` (if `SENTRY_DSN` present) | Error tracking & telemetry |

## 3. Webhook Architecture

External event callbacks (such as Stripe subscription changes) are ingested via dedicated route handlers with signature validation and logged into `webhook_events` for idempotent, retry-safe processing.
