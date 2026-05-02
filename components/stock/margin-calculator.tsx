'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function MarginCalculator() {
  const { register, control, setValue } = useFormContext()
  
  const purchasePrice = useWatch({ control, name: 'purchase_price', defaultValue: 0 }) || 0
  const askingPrice = useWatch({ control, name: 'asking_price', defaultValue: 0 }) || 0
  const prepCost = useWatch({ control, name: 'prep_cost', defaultValue: 0 }) || 0
  const transportCost = useWatch({ control, name: 'transport_cost', defaultValue: 0 }) || 0

  const totalCost = Number(purchasePrice) + Number(prepCost) + Number(transportCost)
  const margin = Number(askingPrice) - totalCost
  const marginPercent = askingPrice > 0 ? (margin / askingPrice) * 100 : 0

  // For visual demo purposes we just use standard inputs rather than complex array fields
  // In a real app we'd use useFieldArray for dynamic expenses

  return (
    <div className="bg-carbon border border-steel p-6 rounded-[2px] flex flex-col lg:flex-row gap-8">
      
      {/* Inputs Side */}
      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <h3 className="font-syne font-bold text-base text-cream border-b border-steel pb-2">Acquisition Costs</h3>
          
          <div className="space-y-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Purchase Price *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pewter font-mono">£</span>
              <Input {...register('purchase_price', { valueAsNumber: true })} type="number" className="pl-8 font-mono text-lg" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Prep/Recon</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pewter font-mono">£</span>
                <Input {...register('prep_cost', { valueAsNumber: true })} type="number" className="pl-8 font-mono" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Transport</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pewter font-mono">£</span>
                <Input {...register('transport_cost', { valueAsNumber: true })} type="number" className="pl-8 font-mono" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-steel">
          <h3 className="font-syne font-bold text-base text-cream border-b border-steel pb-2">Retail Pricing</h3>
          
          <div className="space-y-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Asking Price *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pewter font-mono">£</span>
              <Input {...register('asking_price', { valueAsNumber: true })} type="number" className="pl-8 font-mono text-2xl h-14 bg-blue/5 border-blue/30 text-cream" />
            </div>
          </div>
        </div>
      </div>

      {/* Output Side */}
      <div className="lg:w-80 bg-asphalt border border-steel p-6 rounded-[2px] flex flex-col justify-between">
        <div>
          <h3 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-6">Margin Analysis</h3>
          
          <div className="space-y-4 font-mono text-[13px]">
            <div className="flex justify-between text-silver">
              <span>Purchase Price</span>
              <span>{formatCurrency(purchasePrice)}</span>
            </div>
            <div className="flex justify-between text-silver">
              <span>Prep & Recon</span>
              <span>{formatCurrency(prepCost)}</span>
            </div>
            <div className="flex justify-between text-silver">
              <span>Transport</span>
              <span>{formatCurrency(transportCost)}</span>
            </div>
            <div className="flex justify-between text-cream font-bold pt-4 border-t border-steel">
              <span>Total Cost</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
            
            <div className="flex justify-between text-cream pt-4 mt-4 border-t border-steel">
              <span>Asking Price</span>
              <span className="text-[16px]">{formatCurrency(askingPrice)}</span>
            </div>
          </div>
        </div>
        
        <div className={cn(
          "mt-8 p-4 border rounded-[2px]",
          margin > 0 ? "bg-positive/5 border-positive/20" : "bg-negative/5 border-negative/20"
        )}>
          <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-2">Projected Gross Margin</p>
          <div className="flex items-end justify-between">
            <span className={cn(
              "font-mono text-3xl font-bold",
              margin > 0 ? "text-positive" : "text-negative"
            )}>
              {margin > 0 ? '+' : ''}{formatCurrency(margin)}
            </span>
            <span className={cn(
              "font-mono text-lg mb-1",
              margin > 0 ? "text-positive" : "text-negative"
            )}>
              {marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
