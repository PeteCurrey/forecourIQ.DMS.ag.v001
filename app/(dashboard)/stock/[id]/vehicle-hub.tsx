'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Car, 
  FileText, 
  Wrench, 
  PoundSterling, 
  Image as ImageIcon, 
  Share2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  Inbox, 
  Layers,
  History,
  ShieldCheck,
  Check,
  ChevronRight,
  Upload,
  ArrowRight,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatRegistration } from '@/lib/format';
import { 
  VehicleRecord, 
  VehicleLifecycleStatus, 
  calculateCommercials, 
  checkAdvertisingReadiness,
  calculateDaysInStock,
  getAgingSeverity,
  calculateLandedCost
} from '@/lib/services/vehicle-calc';
import { DashboardShell, FilmstripItem } from '@/components/dashboard/dashboard-shell';
import { BreathingCard } from '@/components/ui/breathing-card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VehicleHubProps {
  vehicle: VehicleRecord;
  costs?: any[];
  prepJobs?: any[];
  documents?: any[];
  statusHistory?: any[];
  priceHistory?: any[];
  leads?: any[];
  deals?: any[];
  locations?: { id: string; name: string }[];
  teamMembers?: { id: string; full_name: string }[];
}

export default function VehicleHub({
  vehicle: initialVehicle,
  costs: initialCosts = [],
  prepJobs: initialPrepJobs = [],
  documents = [],
  statusHistory = [],
  priceHistory = [],
  leads = [],
  deals = [],
  locations = [],
  teamMembers = [],
}: VehicleHubProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleRecord>(initialVehicle);
  const [prepJobs, setPrepJobs] = useState<any[]>(initialPrepJobs);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [rightPanelTab, setRightPanelTab] = useState<'prep' | 'audit' | 'leads' | 'docs'>('prep');

  // Quick edit price state
  const [askingPriceInput, setAskingPriceInput] = useState(
    vehicle.asking_price || vehicle.forecourt_price || 0
  );
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // New prep task form modal
  const [showAddPrepModal, setShowAddPrepModal] = useState(false);
  const [newPrepTitle, setNewPrepTitle] = useState('');
  const [newPrepCategory, setNewPrepCategory] = useState('mechanical');
  const [newPrepCost, setNewPrepCost] = useState(0);

  // Calculate landed cost rollup
  const totalPrepCost = prepJobs.reduce((sum, j) => {
    if (j.status === 'cancelled') return sum;
    return sum + (Number(j.actual_cost) || Number(j.estimated_cost) || 0);
  }, 0);

  const purchasePrice = Number(vehicle.purchase_price || vehicle.cost_price || 0);
  const transportCost = Number(vehicle.transport_cost || 0);
  const otherCosts = Number(vehicle.other_acquisition_costs || 0);
  const trueLandedCost = calculateLandedCost(purchasePrice, totalPrepCost, transportCost, otherCosts);

  const currentAskingPrice = Number(vehicle.asking_price || vehicle.forecourt_price || 0);
  const projectedGross = currentAskingPrice - trueLandedCost;
  const projectedMarginPct = currentAskingPrice > 0 ? Math.round((projectedGross / currentAskingPrice) * 100) : 0;

  const daysInStock = calculateDaysInStock(vehicle.purchase_date || vehicle.created_at);
  const agingSeverity = getAgingSeverity(daysInStock);

  // Advertising readiness
  const adReadiness = checkAdvertisingReadiness(vehicle);

  // Resolve images array
  const allImages = [
    ...(vehicle.vehicle_images?.map((i) => i.url) || []),
    ...(vehicle.photos || []),
  ].filter(Boolean);

  const currentHeroImage = allImages[activePhotoIndex] || allImages[0] || null;

  // Handle Save Price Change
  const handleSavePrice = async () => {
    if (askingPriceInput === currentAskingPrice) return;
    setIsUpdatingPrice(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asking_price: askingPriceInput }),
      });
      if (!res.ok) throw new Error('Failed to update asking price');

      setVehicle((prev) => ({
        ...prev,
        asking_price: askingPriceInput,
        forecourt_price: askingPriceInput,
      }));
      toast.success(`Forecourt price updated to ${formatCurrency(askingPriceInput)}`);
    } catch (err: any) {
      toast.error(err.message || 'Error updating price');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Handle Toggle Prep Job Status
  const handleTogglePrepJob = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      const res = await fetch(`/api/prep-jobs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update prep task');

      setPrepJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
      );
      toast.success(`Task marked ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Error updating prep job');
    }
  };

  // Handle Add Prep Task
  const handleAddPrepJob = async () => {
    if (!newPrepTitle.trim()) return;
    try {
      const res = await fetch('/api/prep-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          title: newPrepTitle.trim(),
          category: newPrepCategory,
          estimated_cost: newPrepCost,
          actual_cost: newPrepCost,
          status: 'not_started',
        }),
      });

      if (!res.ok) throw new Error('Failed to create prep task');
      const json = await res.json();

      setPrepJobs((prev) => [json.job, ...prev]);
      toast.success('Reconditioning task added & cost rolled up');
      setShowAddPrepModal(false);
      setNewPrepTitle('');
      setNewPrepCost(0);
    } catch (err: any) {
      toast.error(err.message || 'Error adding task');
    }
  };

  // ── ZONE 1: LEFT DETAIL PANEL (Spec & Commercial Ledger) ──
  const leftPanelContent = (
    <div className="space-y-4 text-body-sm">
      {/* Vehicle Identity */}
      <div className="border-b border-border pb-3">
        <span className="font-mono text-xs font-black tracking-widest bg-[#F5B400] text-black px-2 py-0.5 rounded-xs border border-black/30 uppercase inline-block mb-1.5 shadow-xs">
          {vehicle.registration || vehicle.vrm}
        </span>
        <h2 className="text-h4 font-bold text-text-primary leading-tight">
          {vehicle.make} {vehicle.model}
        </h2>
        <p className="text-caption text-text-secondary mt-0.5">
          {vehicle.variant || vehicle.derivative || `${vehicle.year}`}
        </p>
      </div>

      {/* Days in Stock Pill */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised border border-border">
        <span className="text-caption text-text-muted flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Days in Stock
        </span>
        <span className={cn(
          'text-caption font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums',
          agingSeverity === 'danger' && 'bg-status-danger/10 text-status-danger border-status-danger/40 animate-pulse',
          agingSeverity === 'warning' && 'bg-status-warning/10 text-status-warning border-status-warning/40',
          agingSeverity === 'info' && 'bg-primary/10 text-primary border-primary/30',
          agingSeverity === 'ok' && 'bg-surface text-text-secondary border-border'
        )}>
          {daysInStock} days
        </span>
      </div>

      {/* Commercial Landed Cost Ledger */}
      <div className="space-y-2 p-3 rounded-xl bg-surface-raised border border-border">
        <span className="text-[10px] font-mono uppercase font-bold text-text-muted tracking-wider block mb-1">
          Commercial Landed Ledger
        </span>

        {/* Forecourt Price with Edit */}
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <span className="text-caption font-semibold text-text-secondary">Retail Forecourt</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={askingPriceInput}
              onChange={(e) => setAskingPriceInput(Number(e.target.value))}
              className="w-24 h-7 px-2 rounded-md bg-surface border border-border text-right text-caption font-mono font-bold text-text-primary focus:ring-1 focus:ring-primary"
            />
            {askingPriceInput !== currentAskingPrice && (
              <button
                onClick={handleSavePrice}
                disabled={isUpdatingPrice}
                className="p-1 rounded-md bg-primary text-white text-[10px] font-bold hover:bg-primary-dim"
                title="Save price change"
              >
                <Check className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Cost rollups */}
        <div className="space-y-1 text-[11px] font-mono text-text-secondary pt-1">
          <div className="flex justify-between">
            <span>Acquisition Cost</span>
            <span className="text-text-primary tabular-nums">{formatCurrency(purchasePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span>Reconditioning Prep ({prepJobs.length} tasks)</span>
            <span className="text-text-primary tabular-nums">{formatCurrency(totalPrepCost)}</span>
          </div>
          {transportCost > 0 && (
            <div className="flex justify-between">
              <span>Transport & Handling</span>
              <span className="text-text-primary tabular-nums">{formatCurrency(transportCost)}</span>
            </div>
          )}
          <div className="pt-1.5 border-t border-border flex justify-between font-bold text-text-primary">
            <span>True Landed Cost</span>
            <span className="tabular-nums">{formatCurrency(trueLandedCost)}</span>
          </div>
          <div className="flex justify-between font-bold text-status-success pt-0.5">
            <span>Projected Gross Margin</span>
            <span className="tabular-nums">
              {formatCurrency(Math.max(0, projectedGross))} ({projectedMarginPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="space-y-2 pt-1 border-t border-border">
        <span className="text-[10px] font-mono uppercase font-bold text-text-muted tracking-wider block">
          Key Vehicle Specifications
        </span>
        <div className="grid grid-cols-2 gap-2 text-caption">
          <div className="p-2 rounded-lg bg-surface-raised border border-border">
            <span className="text-text-muted text-[10px] block">Mileage</span>
            <span className="font-bold text-text-primary font-mono">{vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : '—'}</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-raised border border-border">
            <span className="text-text-muted text-[10px] block">Transmission</span>
            <span className="font-bold text-text-primary">{vehicle.transmission || 'Manual'}</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-raised border border-border">
            <span className="text-text-muted text-[10px] block">Fuel Type</span>
            <span className="font-bold text-text-primary">{vehicle.fuel_type || 'Petrol'}</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-raised border border-border">
            <span className="text-text-muted text-[10px] block">Engine Size</span>
            <span className="font-bold text-text-primary">{vehicle.engine_size || '2.0L'}</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-raised border border-border">
            <span className="text-text-muted text-[10px] block">MOT Expiry</span>
            <span className="font-bold text-text-primary font-mono">{vehicle.mot_expiry ? vehicle.mot_expiry : 'Valid 12m'}</span>
          </div>
          <div className="p-2 rounded-lg bg-surface-raised border border-border">
            <span className="text-text-muted text-[10px] block">Source</span>
            <span className="font-bold text-text-primary uppercase text-[10px] font-mono">{vehicle.source || 'Part Ex'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── ZONE 2: CENTER HERO 3D VISUAL AREA (Image Gallery & Breathing Card) ──
  const centerHeroContent = (
    <div className="w-full flex flex-col justify-between space-y-4">
      {/* 3D Perspective Hero Image Container */}
      <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-surface-raised border border-border/80 shadow-glass-card group flex items-center justify-center">
        {currentHeroImage ? (
          <img
            src={currentHeroImage}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-text-muted gap-2">
            <Car className="w-16 h-16 opacity-30 text-primary animate-pulse" />
            <span className="text-caption font-mono uppercase tracking-widest text-text-muted">Awaiting Vehicle Photography</span>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-bg-surface via-transparent to-black/30 pointer-events-none" />

        {/* Floating Telemetry Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-primary/40 text-primary text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Active Stock Unit
          </span>
        </div>

        {/* UK Reg Plate */}
        <div className="absolute top-3 right-3 z-10">
          <span className="font-mono text-xs font-black tracking-widest bg-[#F5B400] text-black px-2.5 py-1 rounded-xs shadow-md border border-black/30 uppercase">
            {vehicle.registration || vehicle.vrm}
          </span>
        </div>

        {/* Advertising Readiness HUD */}
        <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between p-2.5 rounded-xl bg-surface/85 backdrop-blur-md border border-border/80 text-caption shadow-lg">
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              adReadiness.isReady ? 'bg-status-success' : 'bg-status-warning'
            )} />
            <span className="font-semibold text-text-primary">
              {adReadiness.isReady ? 'Advertising Ready (AutoTrader / Motors)' : `${adReadiness.missingItems.length} items missing for publishing`}
            </span>
          </div>
          <span className="font-mono text-caption text-text-secondary">
            {allImages.length} Photos
          </span>
        </div>
      </div>

      {/* Photo Filmstrip Strip */}
      {allImages.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActivePhotoIndex(idx)}
              className={cn(
                'w-16 h-12 rounded-lg overflow-hidden border shrink-0 transition-all outline-hidden',
                activePhotoIndex === idx 
                  ? 'border-primary shadow-glow-primary scale-105' 
                  : 'border-border opacity-70 hover:opacity-100'
              )}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── ZONE 3: RIGHT SECONDARY DETAIL PANEL (Prep Checklist & Timeline) ──
  const rightPanelContent = (
    <div className="space-y-3.5">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        <button
          onClick={() => setRightPanelTab('prep')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-caption font-semibold transition-colors',
            rightPanelTab === 'prep' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Reconditioning ({prepJobs.length})
        </button>
        <button
          onClick={() => setRightPanelTab('audit')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-caption font-semibold transition-colors',
            rightPanelTab === 'audit' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Audit History
        </button>
        <button
          onClick={() => setRightPanelTab('leads')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-caption font-semibold transition-colors',
            rightPanelTab === 'leads' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Leads ({leads.length})
        </button>
      </div>

      {/* TAB 1: RECONDITIONING PREP CHECKLIST */}
      {rightPanelTab === 'prep' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-mono uppercase font-bold text-text-muted">
              Prep Tasks & Landed Costs
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddPrepModal(true)}
              className="h-6 px-2 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Task</span>
            </Button>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto no-scrollbar">
            {prepJobs.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface border border-border text-center text-caption text-text-muted">
                No reconditioning tasks assigned. Click "Add Task" to record mechanical or cosmetic prep work.
              </div>
            ) : (
              prepJobs.map((job) => {
                const isComplete = job.status === 'completed';
                const cost = Number(job.actual_cost || job.estimated_cost || 0);

                return (
                  <div
                    key={job.id}
                    className={cn(
                      'p-2.5 rounded-xl border transition-colors flex items-start justify-between gap-2.5',
                      isComplete ? 'bg-surface/50 border-border opacity-80' : 'bg-surface border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleTogglePrepJob(job.id, job.status)}
                        className={cn(
                          'w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors',
                          isComplete ? 'bg-status-success border-status-success text-white' : 'border-border hover:border-primary'
                        )}
                        title="Toggle task completion"
                      >
                        {isComplete && <Check className="w-3 h-3" />}
                      </button>
                      <div>
                        <div className={cn('text-caption font-bold text-text-primary', isComplete && 'line-through text-text-muted')}>
                          {job.title}
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary capitalize">
                          {job.category || 'mechanical'}
                        </span>
                      </div>
                    </div>

                    <span className="text-caption font-mono font-bold text-text-primary tabular-nums shrink-0">
                      {formatCurrency(cost)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-surface border border-border flex items-center justify-between text-caption font-mono">
            <span className="text-text-muted">Rolled-Up Prep Total:</span>
            <span className="font-bold text-text-primary tabular-nums">{formatCurrency(totalPrepCost)}</span>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL */}
      {rightPanelTab === 'audit' && (
        <div className="space-y-2 max-h-[380px] overflow-y-auto no-scrollbar">
          <span className="text-caption font-mono uppercase font-bold text-text-muted block mb-1">
            Price & Status History
          </span>
          {priceHistory.length === 0 && statusHistory.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface border border-border text-center text-caption text-text-muted">
              No previous price or status changes recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {priceHistory.map((p, idx) => (
                <div key={`p-${idx}`} className="p-2.5 rounded-xl bg-surface border border-border text-caption">
                  <div className="flex items-center justify-between text-text-primary font-bold">
                    <span>Price Adjusted</span>
                    <span className="font-mono">{formatCurrency(p.new_price || p.asking_price)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                    {p.created_at ? format(new Date(p.created_at), 'd MMM yyyy HH:mm') : 'Recent'}
                  </span>
                </div>
              ))}
              {statusHistory.map((s, idx) => (
                <div key={`s-${idx}`} className="p-2.5 rounded-xl bg-surface border border-border text-caption">
                  <div className="flex items-center justify-between text-text-primary font-bold">
                    <span>Status Changed</span>
                    <span className="font-mono text-primary uppercase text-[10px]">{s.new_status}</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                    {s.created_at ? format(new Date(s.created_at), 'd MMM yyyy HH:mm') : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEADS ON VEHICLE */}
      {rightPanelTab === 'leads' && (
        <div className="space-y-2 max-h-[380px] overflow-y-auto no-scrollbar">
          <span className="text-caption font-mono uppercase font-bold text-text-muted block mb-1">
            Active Prospective Buyers
          </span>
          {leads.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface border border-border text-center text-caption text-text-muted">
              No active CRM enquiries linked to this vehicle.
            </div>
          ) : (
            leads.map((l) => (
              <div key={l.id} className="p-2.5 rounded-xl bg-surface border border-border text-caption space-y-1">
                <div className="flex items-center justify-between font-bold text-text-primary">
                  <span>{l.first_name} {l.last_name}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                    {l.status}
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary truncate">{l.phone || l.email}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full flex flex-col space-y-6 pb-20">
      
      {/* Back Link & Navigation Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/stock"
            className="flex items-center gap-1 text-caption font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stockbook</span>
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-caption font-bold text-text-primary">
            {vehicle.make} {vehicle.model}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 text-caption font-semibold"
          >
            <Link href={`/stock/edit/${vehicle.id}`}>
              Edit Vehicle
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 3-ZONE DASHBOARD SHELL ── */}
      <DashboardShell
        leftPanel={leftPanelContent}
        leftPanelTitle="Commercial Ledger"
        leftPanelSubtitle="Vehicle Specs & Landed Costs"
        centerHero={centerHeroContent}
        centerHeroTitle="Vehicle Photography & Telemetry"
        rightPanel={rightPanelContent}
        rightPanelTitle="Operational Timeline & Tasks"
      />

      {/* ── MODAL: ADD RECONDITIONING PREP TASK ── */}
      {showAddPrepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-surface-raised border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-h4 font-bold text-text-primary">Add Reconditioning Task</h3>
              <button onClick={() => setShowAddPrepModal(false)} className="text-text-muted hover:text-text-primary">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-caption font-semibold uppercase text-text-muted block mb-1">Task Title</label>
                <input
                  type="text"
                  value={newPrepTitle}
                  onChange={(e) => setNewPrepTitle(e.target.value)}
                  placeholder="e.g. 2x Front Pirelli Tyres & Alignment"
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-body-sm text-text-primary focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-caption font-semibold uppercase text-text-muted block mb-1">Category</label>
                <select
                  value={newPrepCategory}
                  onChange={(e) => setNewPrepCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-body-sm text-text-primary focus:ring-2 focus:ring-primary"
                >
                  <option value="mechanical">Mechanical & Engine</option>
                  <option value="tyres">Tyres & Wheels</option>
                  <option value="bodywork">Bodywork & Paint</option>
                  <option value="valeting">Valeting & Detailing</option>
                  <option value="service">Full Service</option>
                  <option value="mot">MOT Test</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-caption font-semibold uppercase text-text-muted block mb-1">Actual Cost (£)</label>
                <input
                  type="number"
                  value={newPrepCost}
                  onChange={(e) => setNewPrepCost(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-body-sm font-mono text-text-primary focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setShowAddPrepModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddPrepJob}
                disabled={!newPrepTitle.trim()}
                className="bg-primary hover:bg-primary-dim text-white"
              >
                Add Task & Update Landed Cost
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
