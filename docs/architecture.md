# ForecourtIQ DMS — System Architecture

## 1. System Overview

ForecourtIQ DMS is a production-grade, AI-native Dealer Management System engineered specifically for UK independent motor dealerships. It provides an operational intelligence platform connecting vehicle acquisition, stock management, preparation, lead nurturing, customer tracking, deal structuring, compliance, and real-time operational telemetry.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ForecourIQ DMS Platform                            │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ Client Layer                  │ Next.js 16 App Router (React 19, Tailwind)  │
│ Server Boundaries             │ Server Components, Route Handlers, Actions  │
│ Application Service Layer     │ VehicleService, CustomerService, LeadService│
│                               │ DealService, AIService, AuditService        │
│ Security & RBAC               │ Multi-tenant RLS, Role & Permission Engine  │
│ Storage Architecture          │ Supabase Storage (Multi-tenant Buckets)     │
│ Database Engine               │ Cloud PostgreSQL / Supabase                 │
│ External Integrations         │ Stripe, Anthropic, DVLA/Portals (Registry)  │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

## 2. Core Tenancy Hierarchy

Tenancy is enforced deterministically at the database security level using Postgres Row Level Security (RLS). Every operational query is scoped via the user's verified session profile.

```
Platform
   │
   └── Dealership (Organisation Tenant)
         │
         ├── Dealership Locations (Multi-Site)
         ├── Team Members & Roles (RBAC)
         ├── Customers (Durable Client Identity)
         ├── Vehicles & Stockbook (Assets, Prep, Costs)
         ├── Leads & Conversations (Opportunities)
         ├── Deals & Proposals (Financial Transactions)
         ├── AI Telemetry & Runs (IQ Telemetry)
         └── Audit Log (Immutable Change Records)
```

## 3. Application Service Layer

UI components and API endpoints do not execute raw cross-cutting business logic directly. Domain operations are encapsulated inside dedicated application services:

- `VehicleService` (`lib/services/vehicle.ts`): Vehicle lifecycle transitions, profit margin calculations, stock age calculation, and price change audit logging.
- `CustomerService` (`lib/services/customer.ts`): Durable customer relationship management, contact deduplication from incoming leads.
- `LeadService` (`lib/services/lead.ts`): Multi-channel lead ingestion, status Kanban progression, customer linkage, and activity timelines.
- `DealService` (`lib/services/deal.ts`): Deal desk structuring, discounts, deposits, part exchanges, and gross margin tracking.
- `AIService` (`lib/services/ai.ts`): Central Anthropic Claude orchestration with deterministic prompting and structured run logging.
- `AuditService` (`lib/services/audit.ts`): Non-blocking operational change auditing.

## 4. Operational Workflow Progression

```
[Acquisition / Stock In] ──► [Inspection & Prep] ──► [Photography & Adverts]
                                                             │
                                                             ▼
[Won / Handover / Sold]  ◄── [Deal / Finance / Deposit] ◄── [Lead / Customer]
```
