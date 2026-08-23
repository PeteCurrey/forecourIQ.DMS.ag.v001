'use client'

import React, { useState, useEffect } from 'react'
import {
  calcAgreedPrice,
  calcCustomerPurchaseTotal,
  calcPXEquity,
  calcBalanceToFund,
  calcProjectedGross,
  isNegativeEquity,
  DealLineItem,
} from '@/lib/services/deal-calc'
import { Calculator, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

interface DealCalculatorProps {
  initialRetail?: number
  initialDiscount?: number
  initialLineItems?: DealLineItem[]
  initialPXAllowance?: number
  initialPXSettlement?: number
  initialDeposit?: number
  vehicleCost?: number
  canViewMargin?: boolean
  onApplyValues?: (values: {
    retailPrice: number
    discount: number
    agreedPrice: number
    pxAllowance: number
    pxSettlement: number
    deposit: number
    balanceToFund: number
  }) => void
}

export function DealCalculator({
  initialRetail = 0,
  initialDiscount = 0,
  initialLineItems = [],
  initialPXAllowance = 0,
  initialPXSettlement = 0,
  initialDeposit = 0,
  vehicleCost = 0,
  canViewMargin = false,
  onApplyValues,
}: DealCalculatorProps) {
  const [retail, setRetail] = useState<number>(initialRetail)
  const [discount, setDiscount] = useState<number>(initialDiscount)
  const [pxAllowance, setPxAllowance] = useState<number>(initialPXAllowance)
  const [pxSettlement, setPxSettlement] = useState<number>(initialPXSettlement)
  const [deposit, setDeposit] = useState<number>(initialDeposit)

  useEffect(() => {
    setRetail(initialRetail)
    setDiscount(initialDiscount)
    setPxAllowance(initialPXAllowance)
    setPxSettlement(initialPXSettlement)
    setDeposit(initialDeposit)
  }, [initialRetail, initialDiscount, initialPXAllowance, initialPXSettlement, initialDeposit])

  const agreedPrice = calcAgreedPrice(retail, discount)
  const purchaseTotal = calcCustomerPurchaseTotal(agreedPrice, initialLineItems)
  const pxEquity = calcPXEquity(pxAllowance, pxSettlement)
  const balanceToFund = calcBalanceToFund(purchaseTotal, pxEquity, deposit)
  const projectedGross = calcProjectedGross(agreedPrice, vehicleCost)
  const hasNegativeEquity = isNegativeEquity(pxEquity)

  return (
    <div className="bg-carbon border border-steel rounded-[2px] p-4 text-cream">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-steel/60">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-blue" />
          <h3 className="font-syne font-bold text-[14px] uppercase tracking-wide">Deal Desk Calculator</h3>
        </div>
        <span className="font-mono text-[10px] text-pewter bg-asphalt px-2 py-0.5 rounded-[2px] border border-steel">
          DETERMINISTIC ENGINE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-pewter text-[11px] font-mono mb-1">Vehicle Retail Price (£)</label>
            <input
              type="number"
              value={retail || ''}
              onChange={(e) => setRetail(parseFloat(e.target.value) || 0)}
              className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream focus:border-blue outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-pewter text-[11px] font-mono mb-1">Agreed Discount (£)</label>
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream focus:border-blue outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-pewter text-[11px] font-mono mb-1">Part Exchange Allowance (£)</label>
            <input
              type="number"
              value={pxAllowance || ''}
              onChange={(e) => setPxAllowance(parseFloat(e.target.value) || 0)}
              className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream focus:border-blue outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-pewter text-[11px] font-mono mb-1">Part Exchange Settlement (£)</label>
            <input
              type="number"
              value={pxSettlement || ''}
              onChange={(e) => setPxSettlement(parseFloat(e.target.value) || 0)}
              className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream focus:border-blue outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-pewter text-[11px] font-mono mb-1">Deposit Paid / Required (£)</label>
            <input
              type="number"
              value={deposit || ''}
              onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
              className="w-full bg-asphalt border border-steel px-3 py-1.5 rounded-[2px] font-mono text-cream focus:border-blue outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Live Calculation Readout */}
        <div className="bg-asphalt border border-steel rounded-[2px] p-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-steel/40">
              <span className="text-pewter font-inter">Agreed Vehicle Price:</span>
              <span className="font-mono font-bold text-cream">£{agreedPrice.toFixed(2)}</span>
            </div>

            {initialLineItems.length > 0 && (
              <div className="flex justify-between py-1 border-b border-steel/40">
                <span className="text-pewter font-inter">Products & Add-ons:</span>
                <span className="font-mono text-cream">
                  +£{(purchaseTotal - agreedPrice).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-steel/40">
              <span className="text-pewter font-inter">Customer Purchase Total:</span>
              <span className="font-mono font-bold text-cream">£{purchaseTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-steel/40 items-center">
              <span className="text-pewter font-inter">PX Net Equity:</span>
              <div className="text-right">
                <span className={`font-mono font-bold ${hasNegativeEquity ? 'text-negative' : 'text-positive'}`}>
                  {hasNegativeEquity ? `-£${Math.abs(pxEquity).toFixed(2)}` : `£${pxEquity.toFixed(2)}`}
                </span>
                {hasNegativeEquity && (
                  <div className="flex items-center gap-1 text-[10px] text-negative font-mono mt-0.5">
                    <AlertTriangle size={10} /> NEGATIVE EQUITY
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-steel/40">
              <span className="text-pewter font-inter">Deposit Applied:</span>
              <span className="font-mono text-cream">-£{deposit.toFixed(2)}</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-baseline">
                <span className="font-syne font-bold text-[13px] text-cream">Balance to Fund:</span>
                <span className="font-mono text-[16px] font-bold text-blue">£{balanceToFund.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-pewter mt-0.5">Amount payable via finance or balance payment.</p>
            </div>

            {canViewMargin && vehicleCost > 0 && (
              <div className="mt-3 pt-3 border-t border-steel/60 bg-carbon/50 p-2 rounded-[2px]">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-pewter">Projected Gross:</span>
                  <span className={`font-mono font-bold ${projectedGross >= 0 ? 'text-positive' : 'text-negative'}`}>
                    £{projectedGross.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {onApplyValues && (
            <button
              type="button"
              onClick={() =>
                onApplyValues({
                  retailPrice: retail,
                  discount,
                  agreedPrice,
                  pxAllowance,
                  pxSettlement,
                  deposit,
                  balanceToFund,
                })
              }
              className="w-full mt-3 bg-blue hover:bg-blue/90 text-cream font-medium py-1.5 rounded-[2px] transition flex items-center justify-center gap-1.5 text-xs"
            >
              <CheckCircle2 size={13} /> Apply to Deal Proposal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
