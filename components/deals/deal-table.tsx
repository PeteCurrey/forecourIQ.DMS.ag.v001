'use client'

import React from 'react'
import Link from 'next/link'
import { DealRecord, calcAgreedPrice } from '@/lib/services/deal-calc'
import { Car, User, ArrowUpRight } from 'lucide-react'

interface DealTableProps {
  deals: DealRecord[]
  canReadMargin?: boolean
}

export function DealTable({ deals, canReadMargin = false }: DealTableProps) {
  return (
    <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden text-cream">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-steel bg-carbon font-mono text-[11px] text-pewter uppercase tracking-wider">
              <th className="p-3">Reference</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Agreed Price</th>
              <th className="p-3">Deposit</th>
              <th className="p-3">Method</th>
              <th className="p-3">Salesperson</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel/40 font-inter">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-pewter">
                  No deals match the specified filters.
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
                const agreed = calcAgreedPrice(deal.vehicle_retail_price, deal.discount_amount)
                const depositPaid = Number(deal.deposit_paid || 0)
                const depositRequired = Number(deal.deposit_required || 0)
                const isDepositMet = depositRequired > 0 && depositPaid >= depositRequired

                return (
                  <tr key={deal.id} className="hover:bg-asphalt/50 transition">
                    <td className="p-3 font-mono font-bold text-cream">
                      <Link href={`/deals/${deal.id}`} className="hover:text-blue transition">
                        {deal.deal_reference || `DEAL #${deal.deal_number || deal.id.slice(0, 8)}`}
                      </Link>
                    </td>

                    <td className="p-3">
                      {deal.customers ? (
                        <Link href={`/customers/${deal.customers.id}`} className="hover:text-blue text-silver font-medium block truncate max-w-[140px]">
                          {deal.customers.first_name} {deal.customers.last_name}
                        </Link>
                      ) : (
                        <span className="text-pewter italic">Unassigned</span>
                      )}
                    </td>

                    <td className="p-3">
                      {deal.vehicles ? (
                        <div>
                          <span className="font-mono font-bold text-cream block">{deal.vehicles.registration}</span>
                          <span className="text-pewter text-[11px] block truncate max-w-[160px]">
                            {deal.vehicles.make} {deal.vehicles.model}
                          </span>
                        </div>
                      ) : (
                        <span className="text-pewter italic">None</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase bg-asphalt border border-steel text-silver">
                        {deal.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-cream">
                      £{agreed.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-3">
                      {depositRequired > 0 ? (
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] ${
                            isDepositMet ? 'bg-positive/20 text-positive' : 'bg-warning/20 text-warning'
                          }`}
                        >
                          £{depositPaid.toFixed(0)} / £{depositRequired.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-pewter font-mono text-[11px]">—</span>
                      )}
                    </td>

                    <td className="p-3 font-mono text-[11px] uppercase text-pewter">
                      {deal.payment_method}
                    </td>

                    <td className="p-3 text-silver truncate max-w-[120px]">
                      {deal.salesperson?.full_name || '—'}
                    </td>

                    <td className="p-3 font-mono text-[11px] text-pewter">
                      {new Date(deal.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="inline-flex items-center gap-1 bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-2 py-1 rounded-[2px] font-mono text-[11px] transition"
                      >
                        Open <ArrowUpRight size={11} />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
