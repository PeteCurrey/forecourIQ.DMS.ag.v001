'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Download, 
  Search, 
  List, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft,
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle,
  AlertCircle,
  MapPin,
  Calendar,
  Filter,
  Car,
  Tag,
  DollarSign,
  Clock,
  Bookmark,
  Trash2,
  X,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Percent,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatRegistration } from '@/lib/format';
import { 
  VehicleRecord, 
  VehicleLifecycleStatus,
  StockKPISummary, 
  calculateCommercials, 
  checkAdvertisingReadiness,
  calculateDaysInStock,
  getAgingSeverity,
  applyBulkPriceAdjustment
} from '@/lib/services/vehicle-calc';
import { BreathingCard } from '@/components/ui/breathing-card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Stock' },
  { id: 'available', label: 'Available' },
  { id: 'in_prep', label: 'In Prep' },
  { id: 'advertised', label: 'Advertised' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'sold', label: 'Sold' },
  { id: 'archived', label: 'Archived' },
];

const PRICE_BANDS = [
  { id: 'all', label: 'All Prices' },
  { id: 'under_15k', label: 'Under £15,000', min: 0, max: 15000 },
  { id: '15k_30k', label: '£15k – £30k', min: 15000, max: 30000 },
  { id: '30k_50k', label: '£30k – £50k', min: 30000, max: 50000 },
  { id: 'over_50k', label: 'Over £50,000', min: 50000, max: Infinity },
];

const AGE_BANDS = [
  { id: 'all', label: 'All Stock Age' },
  { id: '0_30', label: '0–30 Days (Fresh)', min: 0, max: 30 },
  { id: '31_45', label: '31–45 Days (Target)', min: 31, max: 45 },
  { id: '46_60', label: '46–60 Days (Aging Alert)', min: 46, max: 60 },
  { id: '61_90', label: '61–90 Days (Critical)', min: 61, max: 90 },
  { id: 'over_90', label: '90+ Days (Severe)', min: 91, max: Infinity },
];

interface StockClientProps {
  initialVehicles: VehicleRecord[];
  kpis: StockKPISummary;
  locations?: { id: string; name: string }[];
  teamMembers?: { id: string; full_name: string }[];
}

export default function StockClient({ 
  initialVehicles, 
  kpis, 
  locations = [], 
  teamMembers = [] 
}: StockClientProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(initialVehicles);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [selectedMake, setSelectedMake] = useState('all');
  const [selectedPriceBand, setSelectedPriceBand] = useState('all');
  const [selectedAgeBand, setSelectedAgeBand] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'days_desc'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActioning, setIsBulkActioning] = useState(false);

  // Modals for bulk operations
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<VehicleLifecycleStatus>('available');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceAdjType, setPriceAdjType] = useState<'percent' | 'fixed'>('percent');
  const [priceAdjAmount, setPriceAdjAmount] = useState<number>(-5);

  // Saved Presets state
  const [presets, setPresets] = useState<Array<{ id: string; name: string; filters: any }>>([]);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Filmstrip selection state
  const filmstripScrollRef = useRef<HTMLDivElement>(null);
  const [activeFilmstripId, setActiveFilmstripId] = useState<string | null>(null);

  // Fetch saved filter presets
  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetch('/api/stock/presets');
        const data = await res.json();
        if (data.presets) {
          setPresets(data.presets);
        }
      } catch (err) {
        console.warn('Failed to load presets:', err);
      }
    }
    loadPresets();
  }, []);

  // Compute unique makes for dropdown
  const uniqueMakes = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.make) set.add(v.make);
    });
    return Array.from(set).sort();
  }, [vehicles]);

  // Filtered & Sorted Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Status Filter
      if (statusTab !== 'all') {
        if (statusTab === 'in_prep') {
          if (!['inspection', 'preparation', 'in_prep', 'photography'].includes(v.status)) return false;
        } else if (v.status !== statusTab) {
          return false;
        }
      }

      // Make Filter
      if (selectedMake !== 'all' && v.make.toLowerCase() !== selectedMake.toLowerCase()) {
        return false;
      }

      // Price Band Filter
      if (selectedPriceBand !== 'all') {
        const band = PRICE_BANDS.find((b) => b.id === selectedPriceBand);
        if (band && band.min !== undefined && band.max !== undefined) {
          const price = Number(v.asking_price || v.forecourt_price || 0);
          if (price < band.min || price > band.max) return false;
        }
      }

      // Age Band Filter
      if (selectedAgeBand !== 'all') {
        const band = AGE_BANDS.find((b) => b.id === selectedAgeBand);
        if (band && band.min !== undefined && band.max !== undefined) {
          const days = calculateDaysInStock(v.purchase_date || v.created_at);
          if (days < band.min || days > band.max) return false;
        }
      }

      // Search Filter
      if (search.trim()) {
        const term = search.trim().toLowerCase().replace(/\s+/g, '');
        const reg = (v.registration || v.vrm || '').toLowerCase().replace(/\s+/g, '');
        const make = (v.make || '').toLowerCase();
        const model = (v.model || '').toLowerCase();
        const variant = (v.variant || v.derivative || '').toLowerCase();
        const vin = (v.vin || '').toLowerCase();
        if (!reg.includes(term) && !make.includes(term) && !model.includes(term) && !variant.includes(term) && !vin.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'price_desc') return Number(b.asking_price || 0) - Number(a.asking_price || 0);
      if (sortBy === 'price_asc') return Number(a.asking_price || 0) - Number(b.asking_price || 0);
      if (sortBy === 'days_desc') {
        const daysA = calculateDaysInStock(a.purchase_date || a.created_at);
        const daysB = calculateDaysInStock(b.purchase_date || b.created_at);
        return daysB - daysA;
      }
      return 0;
    });
  }, [vehicles, search, statusTab, selectedMake, selectedPriceBand, selectedAgeBand, sortBy]);

  // Top filmstrip units (highest priority attention / newest units)
  const filmstripUnits = useMemo(() => {
    return filteredVehicles.slice(0, 10);
  }, [filteredVehicles]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredVehicles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVehicles.map((v) => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    window.location.href = '/api/stock/export';
  };

  // Bulk Status Update
  const handleExecuteBulkStatus = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkActioning(true);
    try {
      const res = await fetch('/api/stock/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status_change',
          vehicleIds: selectedIds,
          newStatus: bulkTargetStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      setVehicles((prev) =>
        prev.map((v) =>
          selectedIds.includes(v.id) ? { ...v, status: bulkTargetStatus } : v
        )
      );
      toast.success(`Updated ${selectedIds.length} vehicles to ${bulkTargetStatus}`);
      setShowStatusModal(false);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || 'Bulk status update failed');
    } finally {
      setIsBulkActioning(false);
    }
  };

  // Bulk Price Adjustment
  const handleExecuteBulkPrice = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkActioning(true);
    try {
      const res = await fetch('/api/stock/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'price_adjust',
          vehicleIds: selectedIds,
          adjustmentType: priceAdjType,
          amount: priceAdjAmount,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to adjust prices');

      setVehicles((prev) =>
        prev.map((v) => {
          if (!selectedIds.includes(v.id)) return v;
          const oldPrice = Number(v.asking_price || 0);
          const newPrice = applyBulkPriceAdjustment(oldPrice, priceAdjType, priceAdjAmount);
          return { ...v, asking_price: newPrice, forecourt_price: newPrice };
        })
      );

      toast.success(`Adjusted prices for ${selectedIds.length} vehicles (${priceAdjType === 'percent' ? `${priceAdjAmount}%` : `£${priceAdjAmount}`})`);
      setShowPriceModal(false);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || 'Bulk price adjustment failed');
    } finally {
      setIsBulkActioning(false);
    }
  };

  // Save Filter Preset
  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    try {
      const filters = {
        statusTab,
        selectedMake,
        selectedPriceBand,
        selectedAgeBand,
        sortBy,
      };

      const res = await fetch('/api/stock/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPresetName.trim(),
          filters,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save preset');

      setPresets((prev) => [json.preset, ...prev]);
      toast.success(`Filter preset "${newPresetName}" saved`);
      setShowSavePresetModal(false);
      setNewPresetName('');
    } catch (err: any) {
      toast.error(err.message || 'Error saving preset');
    }
  };

  const handleApplyPreset = (preset: any) => {
    const f = preset.filters || {};
    if (f.statusTab) setStatusTab(f.statusTab);
    if (f.selectedMake) setSelectedMake(f.selectedMake);
    if (f.selectedPriceBand) setSelectedPriceBand(f.selectedPriceBand);
    if (f.selectedAgeBand) setSelectedAgeBand(f.selectedAgeBand);
    if (f.sortBy) setSortBy(f.sortBy);
    toast.info(`Applied filter preset: ${preset.name}`);
  };

  const handleDeletePreset = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/stock/presets?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete preset');
      setPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Deleted preset "${name}"`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Scroll filmstrip
  const scrollFilmstrip = (direction: 'left' | 'right') => {
    if (filmstripScrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      filmstripScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Resolve thumbnail
  const getThumbnail = (v: VehicleRecord) => {
    const primary = v.vehicle_images?.find((img) => img.is_primary)?.url || v.vehicle_images?.[0]?.url;
    if (primary) return primary;
    if (v.photos && v.photos.length > 0) return v.photos[0];
    return null;
  };

  return (
    <div className="w-full flex flex-col space-y-6 pb-20">
      
      {/* ── HEADER & COMMERCIAL METRICS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h2 font-bold text-text-primary tracking-tight">Stockbook Inventory</h1>
            <span className="font-mono text-caption px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold">
              {kpis.totalRetailUnits} ACTIVE UNITS
            </span>
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
            Centralized vehicle fleet operations, reconditioning checklists, and commercial margins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-caption font-semibold">
            <Download className="w-3.5 h-3.5" /> EXPORT CSV
          </Button>
          <Button asChild size="sm" className="gap-2 text-caption font-semibold bg-primary hover:bg-primary-dim text-white shadow-glow-primary">
            <Link href="/stock/add">
              <Plus className="w-4 h-4" /> ADD VEHICLE
            </Link>
          </Button>
        </div>
      </div>

      {/* ── PHASE 1 FILMSTRIP PATTERN (Top Featured Stock) ── */}
      {filmstripUnits.length > 0 && (
        <section className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              <h3 className="text-caption font-mono uppercase font-bold tracking-wider text-text-primary">
                Featured & Priority Units ({filmstripUnits.length})
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollFilmstrip('left')}
                className="p-1 rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollFilmstrip('right')}
                className="p-1 rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={filmstripScrollRef}
            className="flex items-center gap-3.5 overflow-x-auto pb-2 pt-1 scroll-smooth no-scrollbar"
            role="list"
          >
            {filmstripUnits.map((v) => {
              const isSelected = activeFilmstripId === v.id;
              const days = calculateDaysInStock(v.purchase_date || v.created_at);
              const severity = getAgingSeverity(days);
              const thumb = getThumbnail(v);

              return (
                <div
                  key={v.id}
                  onClick={() => setActiveFilmstripId(isSelected ? null : v.id)}
                  tabIndex={0}
                  className={cn(
                    'w-60 sm:w-64 shrink-0 rounded-xl border p-2.5 cursor-pointer transition-all duration-200 outline-hidden',
                    'focus-visible:ring-2 focus-visible:ring-primary',
                    isSelected
                      ? 'bg-surface-raised border-primary shadow-glow-primary -translate-y-1 scale-102 z-10'
                      : 'bg-surface border-border hover:border-primary/40 hover:bg-surface-raised/60'
                  )}
                >
                  <div className="w-full h-24 rounded-lg bg-surface-raised relative overflow-hidden mb-2 border border-border">
                    {thumb ? (
                      <img src={thumb} alt={v.make} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <Car className="w-6 h-6 opacity-30 text-primary" />
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 font-mono text-[9px] font-black tracking-wider bg-[#F5B400] text-black px-1.5 py-0.5 rounded-xs border border-black/30 uppercase">
                      {v.registration || v.vrm}
                    </span>
                    <span className={cn(
                      'absolute top-1.5 right-1.5 text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border backdrop-blur-md',
                      severity === 'danger' && 'bg-status-danger/80 text-white border-status-danger',
                      severity === 'warning' && 'bg-status-warning/80 text-black border-status-warning',
                      severity === 'info' && 'bg-primary/80 text-white border-primary',
                      severity === 'ok' && 'bg-black/60 text-text-secondary border-border'
                    )}>
                      {days}d
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-1.5">
                    <div className="truncate">
                      <div className="text-body-sm font-bold text-text-primary truncate">{v.make} {v.model}</div>
                      <div className="text-caption text-text-secondary truncate">{v.variant || v.derivative || `${v.year}`}</div>
                    </div>
                    <span className="text-caption font-mono font-bold text-text-primary tabular-nums shrink-0">
                      {v.asking_price ? formatCurrency(v.asking_price) : '£POA'}
                    </span>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-text-muted capitalize">{v.status.replace(/_/g, ' ')}</span>
                    <Link
                      href={`/stock/${v.id}`}
                      className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <span>Hub</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── FILTER PRESETS & SEARCH BAR ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-4 shadow-xs">
        {/* Status Tabs Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => {
              const isActive = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-caption font-semibold transition-colors shrink-0 outline-hidden',
                    'focus-visible:ring-2 focus-visible:ring-primary',
                    isActive 
                      ? 'bg-primary text-white font-bold shadow-glow-primary' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'table' ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              )}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search VRM, VIN, make, model..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-raised border border-border text-body-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Make Filter */}
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-raised border border-border text-body-sm text-text-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All Makes ({uniqueMakes.length})</option>
            {uniqueMakes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Price Band Filter */}
          <select
            value={selectedPriceBand}
            onChange={(e) => setSelectedPriceBand(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-raised border border-border text-body-sm text-text-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          >
            {PRICE_BANDS.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>

          {/* Ageing Band Filter */}
          <select
            value={selectedAgeBand}
            onChange={(e) => setSelectedAgeBand(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-raised border border-border text-body-sm text-text-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          >
            {AGE_BANDS.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </div>

        {/* Sort & Presets Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border/80 text-caption">
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-7 px-2 rounded-md bg-surface-raised border border-border text-caption text-text-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="newest">Newest Arrival</option>
              <option value="oldest">Oldest Arrival</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="days_desc">Days in Stock: Longest</option>
            </select>
          </div>

          {/* Presets manager */}
          <div className="flex items-center gap-2">
            {presets.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Saved Preset:</span>
                <div className="flex items-center gap-1">
                  {presets.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 bg-surface-raised border border-border px-2 py-0.5 rounded-md">
                      <button
                        onClick={() => handleApplyPreset(p)}
                        className="hover:text-primary font-medium transition-colors"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(p.id, p.name)}
                        className="text-text-muted hover:text-status-danger ml-1"
                        title="Delete preset"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavePresetModal(true)}
              className="h-7 px-2.5 text-caption font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Current Filters</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── BULK ACTIONS FLOATING TOOLBAR ── */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 w-full bg-surface-raised border border-primary/40 rounded-xl p-3 shadow-glow-primary flex items-center justify-between flex-wrap gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-body-sm font-bold text-text-primary font-mono">
              {selectedIds.length} vehicle{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStatusModal(true)}
              className="h-8 gap-1.5 text-caption font-semibold"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Change Status</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPriceModal(true)}
              className="h-8 gap-1.5 text-caption font-semibold"
            >
              <Percent className="w-3.5 h-3.5 text-primary" />
              <span>Adjust Price</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="h-8 gap-1.5 text-caption font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-caption text-text-muted hover:text-text-primary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── VEHICLE LIST VIEW (TABLE OR GRID) ── */}
      {filteredVehicles.length === 0 ? (
        <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 bg-surface border border-border rounded-2xl text-text-muted">
          <Car className="w-12 h-12 mb-3 opacity-30 text-primary" />
          <h3 className="text-h4 text-text-primary font-bold">No vehicles match current criteria</h3>
          <p className="text-body-sm text-text-secondary max-w-sm mt-1 mb-4">
            Try adjusting your search terms, status filters, or price bands.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setStatusTab('all');
              setSelectedMake('all');
              setSelectedPriceBand('all');
              setSelectedAgeBand('all');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-raised/80 border-b border-border text-caption font-mono uppercase text-text-muted font-bold">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredVehicles.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Registration</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Days in Stock</th>
                  <th className="p-3.5">Mileage</th>
                  <th className="p-3.5">Asking Price</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredVehicles.map((v) => {
                  const isChecked = selectedIds.includes(v.id);
                  const days = calculateDaysInStock(v.purchase_date || v.created_at);
                  const severity = getAgingSeverity(days);
                  const thumb = getThumbnail(v);

                  return (
                    <tr
                      key={v.id}
                      className={cn(
                        'hover:bg-surface-raised/50 transition-colors group',
                        isChecked && 'bg-primary/5'
                      )}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(v.id)}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      {/* Photo & Model */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded-md bg-surface-raised overflow-hidden border border-border shrink-0 relative">
                            {thumb ? (
                              <img src={thumb} alt={v.make} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-muted">
                                <Car className="w-4 h-4 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link href={`/stock/${v.id}`} className="font-bold text-text-primary hover:text-primary transition-colors block">
                              {v.make} {v.model}
                            </Link>
                            <span className="text-caption text-text-secondary truncate block max-w-xs">
                              {v.variant || v.derivative || `${v.year} · ${v.fuel_type || 'Petrol'}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Registration Plate Badge */}
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] font-black tracking-widest bg-[#F5B400] text-black px-2 py-0.5 rounded-xs border border-black/30 shadow-xs uppercase">
                          {v.registration || v.vrm}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <span className={cn(
                          'text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border',
                          v.status === 'available' && 'bg-status-success/10 text-status-success border-status-success/30',
                          v.status === 'in_prep' || v.status === 'preparation' && 'bg-status-warning/10 text-status-warning border-status-warning/30',
                          v.status === 'reserved' && 'bg-primary/10 text-primary border-primary/30',
                          v.status === 'sold' && 'bg-surface-raised text-text-muted border-border',
                          (!['available', 'in_prep', 'preparation', 'reserved', 'sold'].includes(v.status)) && 'bg-surface-raised text-text-secondary border-border'
                        )}>
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Days in Stock & Escalating Color Badge */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'text-caption font-bold font-mono px-2 py-0.5 rounded-md border tabular-nums',
                            severity === 'danger' && 'bg-status-danger/10 text-status-danger border-status-danger/40 animate-pulse',
                            severity === 'warning' && 'bg-status-warning/10 text-status-warning border-status-warning/40',
                            severity === 'info' && 'bg-primary/10 text-primary border-primary/30',
                            severity === 'ok' && 'bg-surface-raised text-text-secondary border-border'
                          )}>
                            {days} days
                          </span>
                          {severity === 'danger' && (
                            <span className="text-[10px] font-mono uppercase text-status-danger font-bold">Aging</span>
                          )}
                        </div>
                      </td>

                      {/* Mileage */}
                      <td className="p-3.5 font-mono text-caption text-text-secondary tabular-nums">
                        {v.mileage ? `${v.mileage.toLocaleString()} mi` : '—'}
                      </td>

                      {/* Price */}
                      <td className="p-3.5 font-mono font-bold text-text-primary tabular-nums">
                        {v.asking_price ? formatCurrency(v.asking_price) : '£POA'}
                      </td>

                      {/* Hub Link */}
                      <td className="p-3.5 text-right">
                        <Link
                          href={`/stock/${v.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-primary hover:text-white border border-border text-caption font-semibold transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVehicles.map((v) => {
            const isChecked = selectedIds.includes(v.id);
            const days = calculateDaysInStock(v.purchase_date || v.created_at);
            const severity = getAgingSeverity(days);
            const thumb = getThumbnail(v);

            return (
              <div
                key={v.id}
                className={cn(
                  'bg-surface border rounded-xl overflow-hidden p-3 transition-all duration-200 group flex flex-col justify-between',
                  isChecked ? 'border-primary shadow-glow-primary bg-surface-raised' : 'border-border hover:border-primary/40 hover:shadow-md'
                )}
              >
                <div>
                  {/* Photo Container */}
                  <div className="w-full h-40 rounded-lg bg-surface-raised relative overflow-hidden mb-3 border border-border">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={v.make}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <Car className="w-10 h-10 opacity-30 text-primary" />
                      </div>
                    )}

                    {/* Reg Plate */}
                    <span className="absolute top-2 left-2 font-mono text-[10px] font-black tracking-widest bg-[#F5B400] text-black px-2 py-0.5 rounded-xs border border-black/30 shadow-xs uppercase">
                      {v.registration || v.vrm}
                    </span>

                    {/* Selection Checkbox */}
                    <div className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur-md p-1 rounded-md">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOne(v.id)}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>

                    {/* Escalating Age Badge */}
                    <span className={cn(
                      'absolute bottom-2 right-2 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border backdrop-blur-md',
                      severity === 'danger' && 'bg-status-danger/90 text-white border-status-danger',
                      severity === 'warning' && 'bg-status-warning/90 text-black border-status-warning',
                      severity === 'info' && 'bg-primary/90 text-white border-primary',
                      severity === 'ok' && 'bg-black/70 text-text-secondary border-border'
                    )}>
                      {days}d in stock
                    </span>
                  </div>

                  {/* Info Header */}
                  <div className="space-y-1 mb-3">
                    <div className="text-body-sm font-bold text-text-primary truncate">
                      {v.make} {v.model}
                    </div>
                    <div className="text-caption text-text-secondary truncate">
                      {v.variant || v.derivative || `${v.year} · ${v.fuel_type || 'Petrol'}`}
                    </div>
                  </div>
                </div>

                {/* Pricing & Ledger Bottom Bar */}
                <div className="pt-2.5 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted block">Forecourt Price</span>
                    <span className="text-h4 font-bold text-text-primary tabular-nums font-mono">
                      {v.asking_price ? formatCurrency(v.asking_price) : '£POA'}
                    </span>
                  </div>

                  <Link
                    href={`/stock/${v.id}`}
                    className="p-2 rounded-lg bg-surface-raised hover:bg-primary hover:text-white border border-border text-text-secondary transition-colors"
                    title="Open Vehicle Hub"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: BULK STATUS CHANGE ── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-surface-raised border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-h4 font-bold text-text-primary">Bulk Change Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-body-sm text-text-secondary">
              Update lifecycle status for <strong className="text-text-primary">{selectedIds.length}</strong> selected vehicles:
            </p>

            <div className="space-y-2">
              <label className="text-caption font-semibold uppercase text-text-muted">Target Lifecycle Status</label>
              <select
                value={bulkTargetStatus}
                onChange={(e: any) => setBulkTargetStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-body-sm text-text-primary focus:ring-2 focus:ring-primary"
              >
                <option value="available">Available (Listed)</option>
                <option value="in_prep">In Preparation</option>
                <option value="advertised">Advertised</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteBulkStatus}
                disabled={isBulkActioning}
                className="bg-primary hover:bg-primary-dim text-white"
              >
                {isBulkActioning ? 'Updating...' : `Apply Status to ${selectedIds.length} Vehicles`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BULK PRICE ADJUSTMENT ── */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-surface-raised border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-h4 font-bold text-text-primary">Bulk Price Adjustment</h3>
              <button onClick={() => setShowPriceModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-body-sm text-text-secondary">
              Apply pricing adjustment across <strong className="text-text-primary">{selectedIds.length}</strong> selected vehicles:
            </p>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriceAdjType('percent')}
                className={cn(
                  'py-2 px-3 rounded-lg border text-caption font-bold transition-colors flex items-center justify-center gap-1.5',
                  priceAdjType === 'percent' ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary'
                )}
              >
                <Percent className="w-3.5 h-3.5" />
                Percentage (%)
              </button>

              <button
                type="button"
                onClick={() => setPriceAdjType('fixed')}
                className={cn(
                  'py-2 px-3 rounded-lg border text-caption font-bold transition-colors flex items-center justify-center gap-1.5',
                  priceAdjType === 'fixed' ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary'
                )}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Fixed Amount (£)
              </button>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold uppercase text-text-muted">
                {priceAdjType === 'percent' ? 'Percentage Adjustment (e.g. -5 for -5%, 3 for +3%)' : 'Fixed Amount in £ (e.g. -500 or 1000)'}
              </label>
              <input
                type="number"
                value={priceAdjAmount}
                onChange={(e) => setPriceAdjAmount(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-body font-mono text-text-primary focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border text-caption text-text-secondary">
              Example: A £20,000 vehicle with {priceAdjType === 'percent' ? `${priceAdjAmount}%` : `£${priceAdjAmount}`} will become{' '}
              <strong className="text-text-primary font-mono">
                {formatCurrency(applyBulkPriceAdjustment(20000, priceAdjType, priceAdjAmount))}
              </strong>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setShowPriceModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteBulkPrice}
                disabled={isBulkActioning || priceAdjAmount === 0}
                className="bg-primary hover:bg-primary-dim text-white"
              >
                {isBulkActioning ? 'Adjusting...' : `Apply Price Change to ${selectedIds.length} Units`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SAVE FILTER PRESET ── */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-surface-raised border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-h4 font-bold text-text-primary">Save Filter Preset</h3>
              <button onClick={() => setShowSavePresetModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-semibold uppercase text-text-muted">Preset Name</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. BMW Under 45 Days"
                className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-body-sm text-text-primary focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setShowSavePresetModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="bg-primary hover:bg-primary-dim text-white"
              >
                Save Preset
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
