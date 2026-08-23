import { createClient } from '@/lib/supabase/server';

export interface ModelUsageParams {
  dealershipId: string;
  userId?: string;
  capability: 'reasoning' | 'fast' | 'generation' | 'ask';
  modelProvider: string;
  modelName: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  status: 'success' | 'failed' | 'rate_limited' | 'fallback_used';
}

export const CostService = {
  /**
   * Log AI request metrics and estimated cost in GBP.
   */
  async logUsage(params: ModelUsageParams): Promise<void> {
    try {
      const supabase = await createClient();

      // Estimated rate: £0.0025 per 1k input tokens, £0.0100 per 1k output tokens for reasoning models
      const costPer1kIn = params.capability === 'reasoning' ? 0.0025 : 0.0008;
      const costPer1kOut = params.capability === 'reasoning' ? 0.0100 : 0.0030;
      const estimatedCost = (params.tokensIn / 1000) * costPer1kIn + (params.tokensOut / 1000) * costPer1kOut;

      await supabase.from('ai_usage_logs').insert({
        dealership_id: params.dealershipId,
        user_id: params.userId || null,
        capability: params.capability,
        model_provider: params.modelProvider,
        model_name: params.modelName,
        tokens_in: params.tokensIn,
        tokens_out: params.tokensOut,
        estimated_cost_gbp: Number(estimatedCost.toFixed(4)),
        latency_ms: params.latencyMs,
        status: params.status,
      });
    } catch {
      // Non-blocking telemetry
    }
  }
};
