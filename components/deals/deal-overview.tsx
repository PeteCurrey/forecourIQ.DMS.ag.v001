'use client'

import React from 'react'
import {
  DealRecord,
  assessDealChecklist,
  calcAgreedPrice,
  calcCustomerPurchaseTotal,
  calcPXEquity,
  calcBalanceToFund,
  getDealAge,
} from '@/lib/services/deal-calc'
import { CheckCircle2, AlertCircle, Clock, Shield, ArrowRight, AlertTriangle } from 'lucide-react'

interface DealOverviewProps {
  deal: DealRecord
  canReadMargin?: boolean
}

export function DealOverview({ deal, canReadMargin = false }: DealOverviewProps) {
  const checklist = assessDealChecklist(deal)
  const agreedPrice = calcAgreedPrice(deal.vehicle_retail_price, deal.discount_amount)
  const lineItems = deal.line_items || []
  const purchaseTotal = calcCustomerPurchaseTotal(agreedPrice, lineItems)
  const pxEquity = calcPXEquity(deal.part_exchange_total, deal.part_exchange_settlement)
  const depositPaid = Number(deal.deposit_paid || 0)
  const balanceToFund = calcBalanceToFund(purchaseTotal, pxEquity, depositPaid)
  const { totalDays, stageDays } = getDealAge(deal)

  return (
    <div className="space-y-6">
      {/* Age & Timing banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-asphalt border border-steel p-3 rounded-[2px]">
          <span className="text-[10px] font-mono text-pewter uppercase block">Total Deal Age</span>
          <span className="font-mono text-base font-bold text-cream">{totalDays} days</span>
        </div>
        <div className="bg-asphalt border border-steel p-3 rounded-[2px]">
          <span className="text-[10px] font-mono text-pewter uppercase block">Days in Current Stage</span>
          <span className="font-mono text-base font-bold text-cream">{stageDays} days</span>
        </div>
        <div className="bg-asphalt border border-steel p-3 rounded-[2px]">
          <span className="text-[10px] font-mono text-pewter uppercase block">Payment Method</span>
          <span className="font-mono text-base font-bold text-blue uppercase">{deal.payment_method}</span>
        </div>
        <div className="bg-asphalt border border-steel p-3 rounded-[2px]">
          <span className="text-[10px] font-mono text-pewter uppercase block">Deposit Required</span>
          <span className="font-mono text-base font-bold text-cream">£{Number(deal.deposit_required || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1 & 2: Financial Stack */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-carbon border border-steel p-4 rounded-[2px]">
            <h3 className="font-syne font-bold text-sm text-cream uppercase tracking-wide mb-3 pb-2 border-b border-steel/60">
              Commercial Breakdown
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-steel/30">
                <span className="text-pewter">Vehicle Retail Price:</span>
                <span className="font-mono font-medium text-cream">£{Number(deal.vehicle_retail_price || 0).toFixed(2)}</span>
              </div>

              {deal.discount_amount > 0 && (
                <div className="flex justify-between py-1 border-b border-steel/30 text-warning">
                  <span>Less Discount ({deal.discount_reason || 'Agreed discount'}):</span>
                  <span className="font-mono font-medium">-£{Number(deal.discount_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-steel/60 font-semibold text-cream">
                <span>Agreed Selling Price:</span>
                <span className="font-mono">£{agreedPrice.toFixed(2)}</span>
              </div>

              {lineItems.length > 0 && (
                <div className="py-2 border-b border-steel/40">
                  <span className="text-[11px] font-mono text-pewter uppercase block mb-1">Products & Accessories:</span>
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 text-pewter pl-2">
                      <span>• {item.description} (x{item.quantity})</span>
                      <span className="font-mono text-cream">+£{(Number(item.customer_price) * Number(item.quantity)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-steel/60 font-bold text-cream bg-asphalt px-2 rounded-[2px]">
                <span>Customer Purchase Total:</span>
                <span className="font-mono">£{purchaseTotal.toFixed(2)}</span>
              </div>

              {deal.part_exchange_total > 0 && (
                <div className="py-2 border-b border-steel/40">
                  <div className="flex justify-between py-0.5">
                    <span className="text-pewter">Part Exchange Allowance:</span>
                    <span className="font-mono text-cream">£{Number(deal.part_exchange_total).toFixed(2)}</span>
                  </div>
                  {deal.part_exchange_settlement > 0 && (
                    <div className="flex justify-between py-0.5 text-pewter">
                      <span>Less Finance Settlement:</span>
                      <span className="font-mono text-cream">-£{Number(deal.part_exchange_settlement).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 font-semibold text-cream">
                    <span>Part Exchange Net Equity:</span>
                    <span className={`font-mono ${pxEquity < 0 ? 'text-negative' : 'text-positive'}`}>
                      £{pxEquity.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-steel/30">
                <span className="text-pewter">Deposit Received:</span>
                <span className="font-mono font-medium text-cream">-£{depositPaid.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-steel text-sm font-bold text-blue bg-asphalt px-3 rounded-[2px] mt-3">
                <span className="font-syne uppercase">Balance to Fund:</span>
                <span className="font-mono text-base">£{balanceToFund.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Operational Checklist */}
        <div className="space-y-4">
          <div className="bg-carbon border border-steel p-4 rounded-[2px]">
            <h3 className="font-syne font-bold text-sm text-cream uppercase tracking-wide mb-3 pb-2 border-b border-steel/60">
              Deal Readiness Checklist
            </h3>

            <div className="space-y-2.5">
              {checklist.map((item) => {
                let icon = <Clock size={14} className="text-pewter shrink-0 mt-0.5" />
                let statusBadge = <span className="text-[10px] font-mono text-pewter">PENDING</span>

                if (item.status === 'complete') {
                  icon = <CheckCircle2 size={14} className="text-positive shrink-0 mt-0.5" />
                  statusBadge = <span className="text-[10px] font-mono text-positive">READY</span>
                } else if (item.status === 'blocked') {
                  icon = <AlertCircle size={14} className="text-negative shrink-0 mt-0.5" />
                  statusBadge = <span className="text-[10px] font-mono text-negative">BLOCKER</span>
                } else if (item.status === 'not_applicable') {
                  statusBadge = <span className="text-[10px] font-mono text-muted">N/A</span>
                }

                return (
                  <div key={item.key} className="flex items-start justify-between gap-2 text-xs py-1 border-b border-steel/20 last:border-0">
                    <div className="flex items-start gap-2">
                      {icon}
                      <div>
                        <span className="text-silver font-medium block">{item.label}</span>
                        {item.detail && <span className="text-[11px] text-pewter block">{item.detail}</span>}
                      </div>
                    </div>
                    {statusBadge}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
