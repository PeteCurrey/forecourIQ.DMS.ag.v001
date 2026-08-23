# ForecourIQ Commercial Launch Claims & Truth Matrix

This internal document assesses every significant public marketing and commercial claim against the verified technical capabilities of ForecourIQ DMS `1.0.0-rc.1`.

---

## Claims Classification Key
- **VERIFIED**: Fully backed by deterministic, tested software logic and infrastructure.
- **SANDBOX TESTED**: Software layer built and tested against mock/sandbox APIs; requires production credentials.
- **COMMERCIAL ACCESS REQUIRED**: Functionally complete in DMS, but requires dealership's direct commercial contract with third-party provider (e.g. AutoTrader Connect agreement).
- **REQUIRES LEGAL REVIEW**: Claim touches regulated financial or data privacy compliance and requires final legal sign-off.
- **REMOVE BEFORE LAUNCH**: Unverified, exaggerated, or unsupported claim that must be removed from marketing copy.

---

## Truth Matrix

| Public Claim | Technical Implementation Status | Classification | Rationale & Guidance |
|---|---|---|---|
| *"AI-Powered Dealer Management System"* | Built via IQ Operating Layer (`Anthropic Claude 3.5 Sonnet / Haiku` + DB context injection + structured recommendations). | **VERIFIED** | Accurate. Human-in-the-loop approval is strictly enforced for high-risk actions. |
| *"Real-Time Stockbook with Instant DVLA Lookup"* | `DVLA Lookup API` integration + `vehicles` table + automatic derivative extraction. | **VERIFIED** | Works reliably using vehicle registration number. |
| *"Multi-Site Group Stock Transfers & Location Auditing"* | `stock_transfers` state machine + atomic `vehicles.location_id` update upon receipt + `vehicle_location_history`. | **VERIFIED** | Prevents location corruption; verified in test suite. |
| *"Omnichannel Lead Ingestion & SLA Tracking"* | Unified leads table, webhook endpoints for portals, response timer, overdue alert badges. | **VERIFIED** | Deterministic SLA calculations; no fake numbers. |
| *"FCA Compliant Finance & Document Governance"* | IDD generation, Demands & Needs capture, Commission Disclosure ledger, tamper-evident hash audit. | **REQUIRES LEGAL REVIEW** | Technical implementation is complete and strict, but legal counsel must verify exact disclosure text before commercial sign-off. |
| *"Full AutoTrader Connect Advertising Sync"* | Direct AutoTrader API client with advertising readiness validation and error mapping. | **COMMERCIAL ACCESS REQUIRED** | Dealership must hold an authorized AutoTrader Connect integration agreement and API credentials. |
| *"Integrated Stripe Deposit Taking & Invoicing"* | Stripe Checkout, Customer Portal, Webhook idempotency, negative equity and PX balance calculation. | **VERIFIED** | Payments verified via webhook event handlers and ledger updates. |
| *"Zero-Setup Instant 48-Hour Dealer Onboarding"* | Step-by-step onboarding wizard (`/onboarding`), CSV stock & customer import with validation preview. | **VERIFIED** | Self-serve onboarding tested with valid and malformed CSV files. |
| *"Making Tax Digital (MTD) Accounting Sync"* | Xero and QuickBooks mapping service with OAuth2 connection states. | **SANDBOX TESTED** | OAuth flow and invoice sync tested; requires live dealer app client credentials. |
| *"100% Autonomous Vehicle Repricing"* | Proactive pricing signals are proposed by IQ, but require human confirmation. | **REMOVE BEFORE LAUNCH** | ForecourIQ intentionally employs Human-in-the-Loop governance to protect dealer gross margins. Autonomous pricing without review is dangerous and not supported. |
| *"Over 500 Active UK Dealerships Using Platform"* | Current pilot phase matrix supports 4 controlled pilot dealership profiles. | **REMOVE BEFORE LAUNCH** | Remove from public marketing until verified post-launch. |
