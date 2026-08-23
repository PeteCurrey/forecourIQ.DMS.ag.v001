# ForecourtIQ DMS — Integrations Architecture (Phase 5)

## 1. Absolute Rule: No Fake Integrations

ForecourIQ DMS strictly enforces truthful integration reporting. If credentials do not exist, an API key is unconfigured, or a commercial provider contract is required, the system explicitly reports:
- `credentials_required`
- `commercial_access_required`
- `not_configured`
- `unsupported`

ForecourIQ will **never**:
- Simulate API responses;
- Fabricate valuation data or provenance checks;
- Simulate portal publishing;
- Pretend customer messages were dispatched;
- Generate fake finance quotes or automated credit decisions.

---

## 2. Canonical Provider Registry Matrix

| Provider | Category | Auth Protocol | Webhooks | Required Fields | Status / Requirement |
|---|---|---|---|---|---|
| **DVLA** | Vehicle Data | API Key | No | `api_key` | VES API access required |
| **CAP HPI** | Vehicle Data | Credentials | No | `api_key`, `account_id` | Commercial Solera contract |
| **AutoTrader Connect** | Advertising | API Key | Yes | `advertiser_id`, `api_key` | AutoTrader Connect API |
| **Motors.co.uk** | Advertising | API Key | Yes | `dealer_id`, `api_key` | Motors dealer subscription |
| **CarGurus UK** | Advertising | API Key | Yes | `dealer_id`, `api_key` | CarGurus listing package |
| **eBay Motors Pro** | Advertising | OAuth2 | Yes | `store_id`, `client_id`, `client_secret` | eBay Motors Pro account |
| **PistonHeads** | Advertising | API Key | Yes | `dealer_id`, `api_key` | Trade advertising account |
| **SendGrid** | Communications | API Key | Yes | `api_key`, `sender_email` | Twilio SendGrid account |
| **Resend** | Communications | API Key | Yes | `api_key`, `sender_email` | Resend account |
| **Twilio SMS** | Communications | Credentials | Yes | `account_sid`, `auth_token`, `phone_number` | Twilio SMS UK sender |
| **WhatsApp Business** | Communications | API Key | Yes | `phone_number_id`, `api_token`, `business_account_id` | Meta Cloud API |
| **Codeweavers** | Finance | API Key | Yes | `api_key`, `dealer_reference` | Codeweavers POS agreement |
| **iVendi** | Finance | API Key | Yes | `partner_id`, `api_key` | iVendi trade partner agreement |
| **Evolution Funding** | Finance | API Key | Yes | `dealer_code`, `api_key` | Evolution introducer agreement |
| **Xero** | Accounting | OAuth2 | Yes | `client_id`, `client_secret` | Xero organisation connection |
| **QuickBooks** | Accounting | OAuth2 | Yes | `client_id`, `client_secret` | Intuit QuickBooks account |
| **Sage** | Accounting | OAuth2 | Yes | `client_id`, `client_secret` | Sage Business Cloud |
| **Stripe** | Payments | API Key | Yes | `secret_key`, `publishable_key`, `webhook_secret` | Stripe merchant account |
| **DocuSign** | E-Signature | OAuth2 | Yes | `account_id`, `client_id`, `client_secret` | DocuSign developer / business |
| **Veriff** | Identity & KYC | API Key | Yes | `api_key`, `api_secret` | Veriff commercial contract |
| **BCA Auctions** | Sourcing | Credentials | No | `account_id`, `api_key` | BCA Dealer Pro |
| **Manheim** | Sourcing | Credentials | No | `account_id`, `api_key` | Cox Automotive account |

---

## 3. Core Architecture & Endpoints

### Vehicle Data Service (`/api/vehicle-data/lookup`)
- Ingests registration, strips whitespace, and calls genuine DVLA VES API if `DVLA_API_KEY` is present.
- Normalizes response into `VehicleDataResult`.
- If unconfigured, returns `isManualFallback: true` with guidance to enter vehicle details manually.

### Advertising Feeds (`/advertising` & `/api/advertising/*`)
- `checkReadiness`: Enforces registration, make, model, asking price > 0, and photos before allowing publishing.
- `publish`: Dispatches to configured portal adapter and sets status to `live`.
- `onVehiclePriceChanged`: Automatically flags live listings as `update_pending`.
- `onVehicleSold`: Automatically withdraws external portal listings.
- Error Work Queue: Surfaces failed syndications with actionable resolution steps.

### Accounting Integration (`/api/accounting/*`)
- Manages Chart of Accounts code mappings (Sales `200`, Cost of Sales `300`, Prep `310`, Deposits `800`).
- Serializes completed Deal records into standard Accounts Receivable Sales Invoices.
- Enforces idempotency via `accounting_sync_logs` table.

### Omnichannel Communications & Webhook Ingestion
- Ingests inbound leads via `/api/webhooks/leads/[provider]` with duplicate prevention (`provider` + `external_lead_id`).
- Outbound routing via SendGrid, Resend, Twilio SMS, or Meta WhatsApp Cloud API with transparent local ledger fallback.
