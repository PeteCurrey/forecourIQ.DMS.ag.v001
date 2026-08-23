'use client';

import { useState } from 'react';
import { StockTransfer, StockTransferStatus } from '@/lib/types/transfers';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ArrowLeftRight, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Car, 
  Plus, 
  X,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface StockTransfersClientProps {
  initialTransfers: StockTransfer[];
  locations: Array<{ id: string; name: string; city?: string }>;
  vehicles: Array<{ id: string; make: string; model: string; registration: string; location_id?: string }>;
  currentUserId: string;
}

const statusColors: Record<StockTransferStatus, string> = {
  requested: 'bg-blue-tint text-blue border border-blue/20',
  approved: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-purple-50 text-purple-700 border border-purple-200',
  in_transit: 'bg-amber-50 text-amber-700 border border-amber-200',
  received: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  cancelled: 'bg-steel text-pewter border border-steel',
};

export default function StockTransfersClient({
  initialTransfers,
  locations,
  vehicles,
  currentUserId,
}: StockTransfersClientProps) {
  const [transfers, setTransfers] = useState<StockTransfer[]>(initialTransfers);
  const [activeTab, setActiveTab] = useState<string>('active');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState<StockTransfer | null>(null);
  const [receiveNotes, setReceiveNotes] = useState('');
  
  // Request Modal State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const originLocationId = selectedVehicle?.location_id || locations[0]?.id || '';

  // Filter transfers
  const filtered = transfers.filter(t => {
    if (activeTab === 'active') return ['requested', 'approved', 'scheduled', 'in_transit'].includes(t.status);
    if (activeTab === 'all') return true;
    return t.status === activeTab;
  });

  // Action Handlers
  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicleId || !destinationLocationId) {
      setErrorMsg('Vehicle and destination site are required.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/stock/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          originLocationId,
          destinationLocationId,
          transferReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request transfer');

      setTransfers(prev => [data.transfer, ...prev]);
      setShowRequestModal(false);
      setSelectedVehicleId('');
      setTransferReason('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(transferId: string) {
    try {
      const res = await fetch(`/api/stock/transfers/${transferId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.transfer) {
        setTransfers(prev => prev.map(t => t.id === transferId ? data.transfer : t));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDispatch(transferId: string) {
    try {
      const res = await fetch(`/api/stock/transfers/${transferId}/dispatch`, { method: 'POST' });
      const data = await res.json();
      if (data.transfer) {
        setTransfers(prev => prev.map(t => t.id === transferId ? data.transfer : t));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConfirmReceive() {
    if (!showReceiveModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/stock/transfers/${showReceiveModal.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionNotes: receiveNotes }),
      });
      const data = await res.json();
      if (data.transfer) {
        setTransfers(prev => prev.map(t => t.id === showReceiveModal.id ? data.transfer : t));
        setShowReceiveModal(null);
        setReceiveNotes('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 reveal-1">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-steel pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-cream tracking-tight">Stock Movements & Transfers</h1>
          <p className="text-xs text-pewter mt-1">
            Group-wide vehicle logistics, dispatch tracking, and permanent site history.
          </p>
        </div>

        <Button
          onClick={() => setShowRequestModal(true)}
          className="bg-cream text-void hover:bg-cream/90 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Request Stock Transfer
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-steel pb-3 text-xs">
        {[
          { id: 'active', label: 'Active Movements' },
          { id: 'requested', label: 'Requested' },
          { id: 'in_transit', label: 'In Transit' },
          { id: 'received', label: 'Completed' },
          { id: 'all', label: 'All Transfers' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-asphalt text-cream font-semibold'
                : 'text-pewter hover:text-cream'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transfers Table */}
      <div className="bg-carbon border border-steel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-asphalt text-pewter border-b border-steel">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Movement Route</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requested By</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel text-cream">
              {filtered.map((t) => {
                const v = t.vehicle;
                return (
                  <tr key={t.id} className="hover:bg-asphalt/40 transition-colors">
                    
                    {/* Reference */}
                    <td className="px-4 py-3.5 font-mono text-[11px] font-medium text-cream">
                      {t.transfer_reference}
                    </td>

                    {/* Vehicle with Thumbnail */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded bg-asphalt border border-steel overflow-hidden shrink-0 flex items-center justify-center">
                          {v?.primary_image_url ? (
                            <img src={v.primary_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Car className="w-4 h-4 text-pewter" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-cream">
                            {v ? `${v.make} ${v.model}` : 'Vehicle'}
                          </div>
                          <span className="font-mono text-[10px] bg-asphalt px-1 py-0.2 rounded text-pewter">
                            {v?.registration || '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{t.origin_location?.name || 'Origin Site'}</span>
                        <span className="text-pewter">→</span>
                        <span className="text-cream">{t.destination_location?.name || 'Destination Site'}</span>
                      </div>
                      {t.transfer_reason && (
                        <p className="text-[11px] text-pewter mt-0.5">{t.transfer_reason}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize', statusColors[t.status])}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Requester */}
                    <td className="px-4 py-3.5 text-pewter">
                      <div>{t.requester?.full_name || 'Staff Member'}</div>
                      <div className="text-[10px]">{new Date(t.requested_at).toLocaleDateString('en-GB')}</div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {t.status === 'requested' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(t.id)}
                          className="text-xs h-7"
                        >
                          Approve
                        </Button>
                      )}
                      {t.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleDispatch(t.id)}
                          className="bg-cream text-void hover:bg-cream/90 text-xs h-7"
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          Dispatch
                        </Button>
                      )}
                      {t.status === 'in_transit' && (
                        <Button
                          size="sm"
                          onClick={() => setShowReceiveModal(t)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Receive Vehicle
                        </Button>
                      )}
                      {t.status === 'received' && (
                        <span className="text-xs text-emerald-600 font-medium">✓ Received</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-pewter">
              No stock transfers in this category.
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-steel pb-3">
              <h2 className="text-sm font-semibold text-cream">Request Stock Transfer</h2>
              <button onClick={() => setShowRequestModal(false)} className="text-pewter hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              {/* Select Vehicle */}
              <div>
                <label className="block text-xs font-medium text-pewter mb-1">Vehicle *</label>
                <select
                  value={selectedVehicleId}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream focus:outline-none"
                  required
                >
                  <option value="">-- Choose vehicle from stock --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.registration})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Location */}
              <div>
                <label className="block text-xs font-medium text-pewter mb-1">Destination Site *</label>
                <select
                  value={destinationLocationId}
                  onChange={e => setDestinationLocationId(e.target.value)}
                  className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream focus:outline-none"
                  required
                >
                  <option value="">-- Select destination location --</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.city ? `(${l.city})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-pewter mb-1">Transfer Reason</label>
                <textarea
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Customer viewing on Saturday, or rebalancing stock..."
                  className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream placeholder:text-pewter focus:outline-none resize-none"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-steel">
                <Button type="button" variant="ghost" onClick={() => setShowRequestModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-cream text-void hover:bg-cream/90 text-xs">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-carbon border border-steel rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-steel pb-3">
              <h2 className="text-sm font-semibold text-cream">Confirm Vehicle Receipt</h2>
              <button onClick={() => setShowReceiveModal(null)} className="text-pewter hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-pewter">
              Confirming receipt will atomically update the vehicle's physical location to <strong className="text-cream">{showReceiveModal.destination_location?.name}</strong> and record a permanent entry in the location history ledger.
            </p>

            <div>
              <label className="block text-xs font-medium text-pewter mb-1">Condition Notes (Optional)</label>
              <textarea
                value={receiveNotes}
                onChange={e => setReceiveNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Arrived in excellent condition. Mileage confirmed at 24,150."
                className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream placeholder:text-pewter focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-steel">
              <Button type="button" variant="ghost" onClick={() => setShowReceiveModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReceive}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {submitting ? 'Processing...' : 'Confirm Receipt & Update Location'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
