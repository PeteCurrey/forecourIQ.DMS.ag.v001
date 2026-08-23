'use client'

import React from 'react'
import { DealRiskSignal } from '@/lib/services/deal-calc'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface DealRiskSignalsProps {
  signals: DealRiskSignal[]
}

export function DealRiskSignals({ signals }: DealRiskSignalsProps) {
  if (!signals || signals.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-4">
      {signals.map((signal) => {
        let borderClass = 'border-steel'
        let bgClass = 'bg-asphalt'
        let textClass = 'text-silver'
        let icon = <Info size={14} className="text-pewter shrink-0 mt-0.5" />

        if (signal.severity === 'critical') {
          borderClass = 'border-negative/60'
          bgClass = 'bg-negative/10'
          textClass = 'text-negative'
          icon = <AlertCircle size={14} className="text-negative shrink-0 mt-0.5" />
        } else if (signal.severity === 'high') {
          borderClass = 'border-warning/60'
          bgClass = 'bg-warning/10'
          textClass = 'text-warning'
          icon = <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
        }

        return (
          <div
            key={signal.key}
            className={`flex items-start gap-2.5 p-2.5 rounded-[2px] border ${borderClass} ${bgClass} text-xs`}
          >
            {icon}
            <div>
              <span className={`font-semibold ${textClass}`}>{signal.label}</span>
              {signal.detail && <span className="text-pewter ml-1.5">— {signal.detail}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
