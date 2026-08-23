import { SourceCategory, DataQualityState, ConfidenceLevel, ProvenanceMetadata } from '@/lib/types/intelligence'

/**
 * Data Governance & Provenance Service
 *
 * Enforces provenance rules and stale data detection across all market
 * and competitor data sources.
 */

// Max age for external market data before it is declared stale (72 hours)
export const EXTERNAL_DATA_STALE_THRESHOLD_MS = 72 * 60 * 60 * 1000

// Max age for competitor observations before warning (168 hours / 7 days)
export const COMPETITOR_DATA_STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

export function evaluateProvenance(
  sourceType: SourceCategory,
  provider: string,
  observedAtIso: string,
  options?: {
    hasFullSpec?: boolean
    sampleSize?: number
    sourceReference?: string | null
  }
): ProvenanceMetadata {
  const observedAt = new Date(observedAtIso).getTime()
  const ageMs = Date.now() - observedAt
  const isStale = ageMs > EXTERNAL_DATA_STALE_THRESHOLD_MS

  let dataQuality: DataQualityState = 'complete'
  let confidence: ConfidenceLevel = 'high'

  if (sourceType === 'UNAVAILABLE' || sourceType === 'UNCONFIGURED') {
    dataQuality = 'unavailable'
    confidence = 'insufficient_data'
  } else if (isStale) {
    dataQuality = 'stale'
    confidence = 'low'
  } else if (options?.sampleSize !== undefined && options.sampleSize < 3) {
    dataQuality = 'partial'
    confidence = 'low'
  } else if (options?.hasFullSpec === false) {
    dataQuality = 'partial'
    confidence = 'medium'
  }

  return {
    source_type: sourceType,
    provider,
    source_reference: options?.sourceReference ?? null,
    observed_at: observedAtIso,
    is_stale: isStale,
    data_quality: dataQuality,
    confidence,
    calculation_version: 'v1.0',
  }
}

export function formatProvenanceBadge(sourceType: SourceCategory): {
  label: string
  colour: string
  description: string
} {
  switch (sourceType) {
    case 'FIRST_PARTY':
      return {
        label: 'FORECOURTIQ DEALER DATA',
        colour: 'emerald',
        description: 'Derived exclusively from your dealership operational records and website visitors.',
      }
    case 'LICENSED_EXTERNAL':
      return {
        label: 'LICENSED EXTERNAL FEED',
        colour: 'blue',
        description: 'Verified feed from connected commercial automotive data partners.',
      }
    case 'PUBLIC_AUTHORISED':
      return {
        label: 'AUTHORISED MARKET DATA',
        colour: 'purple',
        description: 'Aggregated regional market observations from authorised feeds.',
      }
    case 'DEALER_ENTERED':
      return {
        label: 'DEALERSHIP ENTERED',
        colour: 'amber',
        description: 'Manually entered figures or custom operational assumptions.',
      }
    case 'DERIVED':
      return {
        label: 'DETERMINISTIC MODEL',
        colour: 'cyan',
        description: 'Calculated using versioned deterministic mathematical models.',
      }
    case 'UNCONFIGURED':
      return {
        label: 'SOURCE UNCONFIGURED',
        colour: 'pewter',
        description: 'Integration requires API credentials in settings.',
      }
    case 'UNAVAILABLE':
    default:
      return {
        label: 'DATA SOURCE UNAVAILABLE',
        colour: 'rose',
        description: 'External data source is currently unavailable or requires commercial access.',
      }
  }
}
