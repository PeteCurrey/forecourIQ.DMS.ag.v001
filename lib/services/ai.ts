import Anthropic from '@anthropic-ai/sdk'
import { anthropicConfig } from '@/lib/config/env'
import { IntegrationUnavailableError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

/**
 * ForecourIQ AI Service
 *
 * Central service layer for all Anthropic/AI interactions.
 * Every AI call must go through this service — not directly from API routes.
 *
 * This ensures:
 * - Consistent error handling
 * - Usage logging to ai_runs table
 * - Future ability to switch providers
 * - Deterministic pre/post processing
 *
 * AI Capabilities (Phase 0 foundation, full implementation in later phases):
 *   IQ ASK     — Dealer questions about their operation
 *   IQ RECOMMEND — Proactive operational recommendations
 *   IQ CREATE  — Generate communications/content
 *   IQ ACT     — Explicitly authorised actions (Phase 2+)
 *   IQ MONITOR — Operational condition monitoring (Phase 3+)
 *   IQ BRIEF   — Daily/weekly intelligence digest (Phase 3+)
 *
 * PRINCIPLE: Software determines facts. AI interprets facts.
 * AI must never invent compliance states, accounting totals, or stock figures.
 */

export type AICapability = 'IQ_ASK' | 'IQ_RECOMMEND' | 'IQ_CREATE' | 'IQ_ACT' | 'IQ_MONITOR' | 'IQ_BRIEF'

export interface AIRunContext {
  dealershipId: string
  userId: string
  capability: AICapability
  purpose: string
  entityType?: string
  entityId?: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIRunResult {
  content: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  runId?: string
}

function getClient(): Anthropic {
  if (!anthropicConfig.apiKey) {
    throw new IntegrationUnavailableError('Anthropic AI', 'unconfigured')
  }
  return new Anthropic({ apiKey: anthropicConfig.apiKey })
}

/**
 * Execute an AI call and log the run to ai_runs table.
 */
async function executeRun(
  context: AIRunContext,
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens = 2000
): Promise<AIRunResult> {
  const client = getClient()
  const startMs = Date.now()

  let inputTokens = 0
  let outputTokens = 0
  let responseContent = ''
  let success = false
  let errorMessage: string | undefined

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    })

    if (response.content[0]?.type !== 'text') {
      throw new Error('Unexpected content type from Anthropic')
    }

    responseContent = response.content[0].text
    inputTokens = response.usage.input_tokens
    outputTokens = response.usage.output_tokens
    success = true
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw err
  } finally {
    const latencyMs = Date.now() - startMs

    // Log to ai_runs — failures must not block the caller
    try {
      const supabase = await createClient()
      await supabase.from('ai_runs').insert({
        dealership_id: context.dealershipId,
        user_id: context.userId,
        capability: context.capability,
        purpose: context.purpose,
        entity_type: context.entityType ?? null,
        entity_id: context.entityId ?? null,
        model: 'claude-3-5-sonnet-20240620',
        provider: 'anthropic',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
        success,
        error_message: errorMessage ?? null,
        created_at: new Date().toISOString(),
      })
    } catch (logErr) {
      console.error('[AIService] Failed to log ai_run:', logErr)
    }
  }

  return {
    content: responseContent,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startMs,
  }
}

/**
 * IQ ASK — Answer dealer questions about their operation.
 * Context data must be pre-fetched and passed in; AI does not query the DB.
 */
async function ask(
  context: AIRunContext,
  question: string,
  contextData: Record<string, unknown>
): Promise<string> {
  const systemPrompt = `You are ForecourIQ's IQ ASK assistant — a knowledgeable automotive business intelligence analyst for UK independent motor dealers.

You answer questions based ONLY on the dealership data provided. You do not invent statistics, prices, or business intelligence.

If the answer cannot be determined from the provided data, say so clearly.
Keep responses concise, specific, and actionable.
Use UK English. Format numbers as GBP where relevant.`

  const userMessage = `Dealership Context:
${JSON.stringify(contextData, null, 2)}

Question: ${question}`

  const result = await executeRun(
    context,
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    1500
  )

  return result.content
}

/**
 * IQ RECOMMEND — Generate buying signal recommendations from real dealership data.
 * This is the existing buying signals capability, centralised here.
 */
async function generateBuyingSignals(
  context: AIRunContext,
  dealershipData: {
    name: string
    city: string
    county: string
    currentStock: unknown[]
    recentSales: unknown[]
    marketData: unknown[]
  }
): Promise<unknown[]> {
  const systemPrompt = `You are a UK automotive market analyst specialising in independent dealer operations.
You generate specific, data-driven buying recommendations based on real dealership performance data.
You must respond with valid JSON only. Do not invent market statistics — work only from the data provided.`

  const userMessage = `Generate 8 specific buying recommendations for ${dealershipData.name} based in ${dealershipData.city}, ${dealershipData.county}.

CURRENT STOCK (${dealershipData.currentStock.length} vehicles):
${JSON.stringify(dealershipData.currentStock)}

RECENT SALES (last 90 days):
${JSON.stringify(dealershipData.recentSales)}

REGIONAL MARKET DATA:
${JSON.stringify(dealershipData.marketData)}

Generate recommendations that:
- Fill gaps in current stock relative to demand shown in the data
- Prioritise makes/models with proven fast turn for this specific dealer
- Target vehicles with >£3,000 margin potential based on the sales data
- Are realistic for UK independent dealer purchase at auction or trade

Return ONLY a JSON array, no other text:
[{
  "make": string,
  "model": string,
  "year_min": number,
  "year_max": number,
  "fuel_type": string,
  "mileage_max": number,
  "target_buy_price": number,
  "projected_retail": number,
  "projected_margin": number,
  "days_to_sell_estimate": number,
  "demand_score": number,
  "reasoning": string
}]`

  const result = await executeRun(
    context,
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    2000
  )

  // Parse JSON safely
  const text = result.content
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']') + 1

  if (start === -1 || end === 0) {
    throw new Error('AI response did not contain a valid JSON array')
  }

  return JSON.parse(text.substring(start, end))
}

/**
 * IQ CREATE — Generate vehicle descriptions from spec data.
 */
async function generateVehicleDescription(
  context: AIRunContext,
  vehicleSpec: {
    make: string
    model: string
    variant?: string
    year: number
    mileage: number
    colour?: string
    fuel_type?: string
    transmission?: string
    body_type?: string
    highlights?: string[]
    purchase_price?: number
    asking_price?: number
  }
): Promise<string> {
  const systemPrompt = `You are a professional used car copywriter for a premium UK motor dealership.
Write compelling, honest vehicle descriptions for advertising portals.
Use UK English. Be specific about the vehicle features. Do not invent specifications not provided.
Keep descriptions between 80-150 words. Do not include price.`

  const userMessage = `Write a vehicle description for:
${JSON.stringify(vehicleSpec, null, 2)}`

  const result = await executeRun(
    context,
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    400
  )

  return result.content
}

export const AIService = {
  ask,
  generateBuyingSignals,
  generateVehicleDescription,
  isAvailable: () => anthropicConfig.status === 'available',
}
