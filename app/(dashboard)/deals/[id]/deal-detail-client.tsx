'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { DealRecord, assessDealRisks, DealStatus } from '@/lib/services/deal-calc'
import { DealHeader } from '@/components/deals/deal-header'
import { DealRiskSignals } from '@/components/deals/deal-risk-signals'
import { DealOverview } from '@/components/deals/deal-overview'
import { DealProposalBuilder } from '@/components/deals/deal-proposal-builder'
import { DealPXPanel } from '@/components/deals/deal-px-panel'
import { DealFinancePanel } from '@/components/deals/deal-finance-panel'
import { DealPaymentsPanel } from '@/components/deals/deal-payments-panel'
import { DealHandoverChecklist } from '@/components/deals/deal-handover-checklist'
import { DealCalculator } from '@/components/deals/deal-calculator'
import {
  FileText,
  Car,
  Landmark,
  CreditCard,
  CheckSquare,
  Calculator,
  History,
  ArrowLeft,
  XCircle,
  CheckCircle,
} from 'lucide-react'

interface DealDetailClientProps {
  deal: DealRecord
  canReadMargin: boolean
  currentUser: { id: string; full_name?: string; role?: string }
}

type TabType =
  | 'overview'
  | 'proposals'
  | 'part_exchange'
  | 'finance'
  | 'payments'
  | 'handover'
  | 'calculator'
  | 'activity'

export default function DealDetailClient({
  deal: initialDeal,
  canReadMargin,
  currentUser,
}: DealDetailClientProps) {
  const router = useRouter()
  const [deal, setDeal] = useState<DealRecord>(initialDeal)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [completing, setCompleting] = useState(false)

  const risks = assessDealRisks(deal)

  const refreshDeal = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`)
      const data = await res.json()
      if (data.deal) setDeal(data.deal)
    } catch {
      toast.error('Failed to refresh deal')
    }
  }

  const handleCompleteSale = async () => {
    if (!confirm('Are you sure you want to mark this deal as COMPLETED? This will mark the vehicle as SOLD and lead as WON.')) {
      return
    }

    setCompleting(true)
    try {
      const res = await fetch(`/api/deals/${deal.id}/complete`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to complete sale')

      toast.success('Sale completed successfully! Vehicle marked sold.')
      await refreshDeal()
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete sale')
    } finally {
      setCompleting(false)
    }
  }

  const handleCancelDeal = async () => {
    if (!cancelReason) {
      toast.error('Cancellation reason is required')
      return
    }

    setCancelling(true)
    try {
      const res = await fetch(`/api/deals/${deal.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to cancel deal')

      toast.success('Deal cancelled')
      setShowCancelModal(false)
      await refreshDeal()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel deal')
    } finally {
      setCancelling(false)
    }
  }

  const handleGenerateOrderForm = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/documents/order-form`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error('Failed to generate order form')

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(data.html)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
      toast.success('Order form generated')
    } catch {
      toast.error('Failed to generate order form')
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <FileText size={14} /> },
    {
      id: 'proposals',
      label: 'Proposals',
      icon: <FileText size={14} />,
      badge: (deal as any).deal_proposals?.length,
    },
    {
      id: 'part_exchange',
      label: 'Part Exchange',
      icon: <Car size={14} />,
      badge: deal.part_exchanges?.length,
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: <Landmark size={14} />,
      badge: deal.finance_proposals?.length,
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard size={14} />,
      badge: deal.payments?.length,
    },
    { id: 'handover', label: 'Handover', icon: <CheckSquare size={14} /> },
    { id: 'calculator', label: 'Calculator', icon: <Calculator size={14} /> },
    { id: 'activity', label: 'Activity', icon: <History size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link
          href="/deals"
          className="inline-flex items-center gap-1.5 text-xs text-pewter hover:text-cream font-mono transition"
        >
          <ArrowLeft size={13} /> Back to Deal Desk
        </Link>
      </div>

      {/* Header bar */}
      <DealHeader
        deal={deal}
        canReadMargin={canReadMargin}
        onCompleteSale={handleCompleteSale}
        onCancelDeal={() => setShowCancelModal(true)}
        onGenerateOrderForm={handleGenerateOrderForm}
      />

      {/* Risk Signals Alert Banner */}
      <DealRiskSignals signals={risks} />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-steel bg-carbon px-2 rounded-t-[2px] overflow-x-auto text-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-blue text-cream bg-asphalt/50'
                  : 'border-transparent text-silver hover:text-cream hover:bg-asphalt/20'
              }`}
            >
              <span className={isActive ? 'text-blue' : 'text-pewter'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="font-mono text-[10px] bg-asphalt border border-steel px-1.5 py-0.2 rounded-[2px] text-pewter">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'overview' && <DealOverview deal={deal} canReadMargin={canReadMargin} />}

        {activeTab === 'proposals' && (
          <DealProposalBuilder
            deal={deal}
            proposals={(deal as any).deal_proposals || []}
            onProposalCreated={refreshDeal}
          />
        )}

        {activeTab === 'part_exchange' && (
          <DealPXPanel dealId={deal.id} partExchanges={deal.part_exchanges || []} onRefresh={refreshDeal} />
        )}

        {activeTab === 'finance' && (
          <DealFinancePanel
            dealId={deal.id}
            financeProposals={(deal as any).finance_proposals || []}
            dealAgreedPrice={Number(deal.agreed_vehicle_price || 0)}
            dealDeposit={Number(deal.deposit_paid || 0)}
            dealPXEquity={Number(deal.part_exchange_equity || 0)}
            onRefresh={refreshDeal}
          />
        )}

        {activeTab === 'payments' && (
          <DealPaymentsPanel
            dealId={deal.id}
            payments={(deal as any).payments || []}
            depositRequired={Number(deal.deposit_required || 0)}
            depositPaid={Number(deal.deposit_paid || 0)}
            onRefresh={refreshDeal}
          />
        )}

        {activeTab === 'handover' && (
          <DealHandoverChecklist
            dealId={deal.id}
            handoverAt={deal.handover_at}
            existingChecklist={(deal as any).handover_checklists?.[0]?.checklist_items}
            vehiclePrepJobs={(deal as any).vehicles?.preparation_jobs}
            onRefresh={refreshDeal}
          />
        )}

        {activeTab === 'calculator' && (
          <DealCalculator
            initialRetail={Number(deal.vehicle_retail_price || 0)}
            initialDiscount={Number(deal.discount_amount || 0)}
            initialLineItems={deal.line_items || []}
            initialPXAllowance={Number(deal.part_exchange_total || 0)}
            initialPXSettlement={Number(deal.part_exchange_settlement || 0)}
            initialDeposit={Number(deal.deposit_paid || 0)}
            vehicleCost={
              canReadMargin && deal.vehicles ? Number(deal.vehicles.purchase_price || 0) : 0
            }
            canViewMargin={canReadMargin}
            onApplyValues={async (v) => {
              try {
                await fetch(`/api/deals/${deal.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    vehicle_retail_price: v.retailPrice,
                    agreed_vehicle_price: v.agreedPrice,
                    discount_amount: v.discount,
                    deposit_required: v.deposit,
                  }),
                })
                toast.success('Deal terms updated from calculator')
                await refreshDeal()
                setActiveTab('overview')
              } catch {
                toast.error('Failed to update deal terms')
              }
            }}
          />
        )}

        {activeTab === 'activity' && (
          <div className="bg-carbon border border-steel rounded-[2px] p-5 space-y-4">
            <h3 className="font-syne font-bold text-sm uppercase text-cream tracking-wide pb-2 border-b border-steel/60">
              Deal Audit Timeline
            </h3>

            {!(deal as any).deal_status_history || (deal as any).deal_status_history.length === 0 ? (
              <p className="text-xs text-pewter">No status transition history recorded.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {(deal as any).deal_status_history.map((hist: any) => (
                  <div key={hist.id} className="flex items-start gap-3 py-2 border-b border-steel/20 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue mt-1.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-cream">
                          Status changed: {hist.from_status || 'initial'} → {hist.to_status}
                        </span>
                        <span className="text-[10px] font-mono text-pewter">
                          {new Date(hist.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                      {hist.reason && <p className="text-silver italic mt-0.5">&quot;{hist.reason}&quot;</p>}
                      <p className="text-[11px] text-pewter mt-0.5">By {hist.changed_by?.full_name || 'Staff'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Deal Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-[2px] max-w-md w-full p-6 space-y-4 text-cream">
            <div className="flex items-center gap-2 text-negative">
              <XCircle size={20} />
              <h3 className="font-syne font-bold text-lg">Cancel Deal</h3>
            </div>

            <p className="text-xs text-silver">
              Cancelling this deal will release any active vehicle reservation and return the vehicle to available stock.
            </p>

            <div>
              <label className="block text-pewter font-mono text-[11px] mb-1">Reason for cancellation *</label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer decided on different vehicle / Finance declined"
                className="w-full bg-asphalt border border-steel p-2.5 rounded-[2px] text-xs text-cream outline-none focus:border-blue"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="bg-asphalt hover:bg-asphalt/80 text-silver border border-steel px-4 py-1.5 rounded-[2px] text-xs transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelDeal}
                className="bg-negative hover:bg-negative/90 text-cream px-4 py-1.5 rounded-[2px] text-xs font-semibold transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
