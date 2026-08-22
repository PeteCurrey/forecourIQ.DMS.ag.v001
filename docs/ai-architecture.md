# ForecourtIQ DMS — AI Architecture

## 1. Core Operating Principle

> **Software determines facts. AI interprets facts.**

The DMS application layer calculates:
- Days in stock, aging inventory flags
- Acquisition costs, prep expenses, transport fees
- Gross margin and profit percentages
- Overdue lead contact SLAs and conversion rates
- Vehicle status transitions and compliance document requirements

The AI layer interprets and synthesizes:
- Sourcing recommendations based on dealer turnover history
- Explanations of why certain vehicles are aging risks
- Draft customer communications and advertising advert copy
- Natural language query answers grounded strictly in dealer data

## 2. Central AI Service Layer

All AI interactions flow through `AIService` (`lib/services/ai.ts`). AI operations never bypass application permissions or execute arbitrary unconstrained database writes.

### AI Capabilities Roadmap
1. **IQ ASK**: Natural language answers to dealer operational questions using pre-fetched dealership context.
2. **IQ RECOMMEND**: Data-driven vehicle buying recommendations based on current inventory, sales velocity, and regional demand.
3. **IQ CREATE**: Portal vehicle advert copywriting and customer follow-up message generation.
4. **IQ ACT** *(Phase 2+)*: Authorized agentic actions executed via deterministic application services.
5. **IQ MONITOR** *(Phase 3+)*: Continuous operational condition monitoring.
6. **IQ BRIEF** *(Phase 3+)*: Daily executive briefings and weekly intelligence digests.

## 3. Telemetry & Accountability

Every AI invocation writes an execution record to the `ai_runs` table:
- `dealership_id`, `user_id`
- `capability`, `purpose`
- `model`, `provider`
- `input_tokens`, `output_tokens`
- `latency_ms`
- `success`, `error_message`
