'use client'

import React from 'react'
import Link from 'next/link'
import { DealRecord, DealStatus } from '@/lib/services/deal-calc'
import { Badge } from '@/components/ui/badge'
import {
  Car,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

interface DealHeaderProps {
  deal: DealRecord
  canReadMargin?: boolean
  onStatusChange?: (status: DealStatus) => void
  onCompleteSale?: () => void
  onCancelDeal?: () => void
  onGenerateOrderForm?: () => void
}

const STATUS_CONFIG: Record<DealStatus, { label: string; color: string; border: string }> = {
  draft: { label: 'Draft', color: 'bg-pewter/20 text-pewter', border: 'border-steel' },
  proposal: { label: 'Proposal', color: 'bg-blue/20 text-blue', border: 'border-blue/40' },
  negotiation: { label: 'Negotiation', color: 'bg-warning/20 text-warning', border: 'border-warning/40' },
  agreed: { label: 'Agreed', color: 'bg-positive/20 text-positive', border: 'border-positive/40' },
  awaiting_deposit: { label: 'Awaiting Deposit', color: 'bg-warning/20 text-warning', border: 'border-warning/40' },
  reserved: { label: 'Reserved', color: 'bg-blue/20 text-blue', border: 'border-blue/50' },
  finance_pending: { label: 'Finance Pending', color: 'bg-warning/20 text-warning', border: 'border-warning/40' },
  documentation: { label: 'Documentation', color: 'bg-blue/20 text-blue', border: 'border-blue/40' },
  pre_handover: { label: 'Pre-Handover', color: 'bg-blue/30 text-blue', border: 'border-blue/60' },
  handover_ready: { label: 'Handover Ready', color: 'bg-positive/30 text-positive', border: 'border-positive/60' },
  completed: { label: 'Completed (Sold)', color: 'bg-positive text-carbon font-bold', border: 'border-positive' },
  cancelled: { label: 'Cancelled', color: 'bg-negative/20 text-negative', border: 'border-negative/40' },
  lost: { label: 'Lost', color: 'bg-pewter/20 text-pewter', border: 'border-steel' },
}

export function DealHeader({
  deal,
  canReadMargin = false,
  onCompleteSale,
  onCancelDeal,
  onGenerateOrderForm,
}: DealHeaderProps) {
  const statusCfg = STATUS_CONFIG[deal.status] || STATUS_CONFIG.draft
  const agreedPrice = Number(deal.agreed_vehicle_price || 0)
  const depositPaid = Number(deal.deposit_paid || 0)
  const depositRequired = Number(deal.deposit_required || 0)
  const isDepositMet = depositRequired > 0 && depositPaid >= depositRequired

  return (
    <div className="bg-carbon border border-steel rounded-[2px] p-5 mb-6 text-cream">
      {/* Top row: Ref, Status, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-steel/60">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-syne font-bold text-xl tracking-tight text-cream">
                {deal.deal_reference || `DEAL #${deal.deal_number || deal.id.slice(0, 8)}`}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-[2px] text-[11px] font-mono uppercase tracking-wider border ${statusCfg.color} ${statusCfg.border}`}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="font-mono text-[11px] text-pewter mt-0.5">
              Created {new Date(deal.deal_created_at || deal.created_at).toLocaleDateString('en-GB')} · Salesperson:{' '}
              {deal.salesperson?.full_name || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <Link
            href={`/deals/${deal.id}/handover`}
            className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-3 py-1.5 rounded-[2px] transition flex items-center gap-1.5"
          >
            <Calendar size={13} /> Handover Screen
          </Link>

          {onGenerateOrderForm && (
            <button
              type="button"
              onClick={onGenerateOrderForm}
              className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-3 py-1.5 rounded-[2px] transition flex items-center gap-1.5"
            >
              <FileText size={13} /> Order Form
            </button>
          )}

          {deal.status !== 'completed' && deal.status !== 'cancelled' && (
            <>
              {onCancelDeal && (
                <button
                  type="button"
                  onClick={onCancelDeal}
                  className="bg-negative/10 hover:bg-negative/20 text-negative border border-negative/30 px-3 py-1.5 rounded-[2px] transition flex items-center gap-1.5"
                >
                  <XCircle size={13} /> Cancel Deal
                </button>
              )}

              {onCompleteSale && (
                <button
                  type="button"
                  onClick={onCompleteSale}
                  className="bg-positive hover:bg-positive/90 text-carbon font-bold px-3 py-1.5 rounded-[2px] transition flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={14} /> Complete Sale
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Grid Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
        {/* Customer */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-[2px] bg-asphalt border border-steel text-blue shrink-0">
            <User size={16} />
          </div>
          <div>
            <span className="text-[10px] text-pewter font-mono uppercase block">Customer</span>
            {deal.customers ? (
              <Link href={`/customers/${deal.customers.id}`} className="font-semibold text-cream hover:text-blue transition block truncate">
                {deal.customers.first_name} {deal.customers.last_name}
              </Link>
            ) : (
              <span className="text-silver italic">No Customer Linked</span>
            )}
            <span className="text-pewter font-mono text-[11px] block">{deal.customers?.phone || deal.customers?.email || '—'}</span>
          </div>
        </div>

        {/* Vehicle */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-[2px] bg-asphalt border border-steel text-blue shrink-0">
            <Car size={16} />
          </div>
          <div>
            <span className="text-[10px] text-pewter font-mono uppercase block">Vehicle</span>
            {deal.vehicles ? (
              <Link href={`/stock/${deal.vehicles.id}`} className="font-semibold text-cream hover:text-blue transition block truncate">
                {deal.vehicles.registration} · {deal.vehicles.make} {deal.vehicles.model}
              </Link>
            ) : (
              <span className="text-silver italic">No Vehicle Linked</span>
            )}
            <span className="text-pewter font-mono text-[11px] block">
              {deal.vehicles?.year ? `${deal.vehicles.year} · ` : ''}
              {deal.vehicles?.mileage ? `${deal.vehicles.mileage.toLocaleString()} mi` : '—'}
            </span>
          </div>
        </div>

        {/* Agreed Commercials */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-[2px] bg-asphalt border border-steel text-positive shrink-0">
            <CreditCard size={16} />
          </div>
          <div>
            <span className="text-[10px] text-pewter font-mono uppercase block">Agreed Price</span>
            <span className="font-mono font-bold text-cream text-[14px] block">
              £{agreedPrice.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-pewter font-mono text-[10px] uppercase">
                Method: {deal.payment_method}
              </span>
              {depositRequired > 0 && (
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded-[2px] ${
                    isDepositMet ? 'bg-positive/20 text-positive' : 'bg-warning/20 text-warning'
                  }`}
                >
                  Deposit {isDepositMet ? 'Paid' : 'Due'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Handover / Gross */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-[2px] bg-asphalt border border-steel text-blue shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <span className="text-[10px] text-pewter font-mono uppercase block">Handover Date</span>
            <span className="font-semibold text-cream block">
              {deal.handover_at ? new Date(deal.handover_at).toLocaleDateString('en-GB') : 'Not Scheduled'}
            </span>
            {canReadMargin && deal.gross_margin_projected !== undefined && (
              <span className="text-positive font-mono text-[10px] block mt-0.5">
                Proj. Gross: £{Number(deal.gross_margin_projected || 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
