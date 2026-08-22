'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRegistration } from '@/lib/format'
import { VehicleRecord, VehicleLifecycleStatus, calculateCommercials, checkAdvertisingReadiness } from '@/lib/services/vehicle-calc'
import { PrepJobRecord } from '@/lib/services/preparation'
import { format, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import PhotoUploader from '@/components/stock/photo-uploader'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'specs', label: 'Vehicle Specs', icon: Car },
  { id: 'acquisition', label: 'Acquisition', icon: PoundSterling },
  { id: 'preparation', label: 'Preparation', icon: Wrench },
  { id: 'costs', label: 'Cost Ledger', icon: PoundSterling },
  { id: 'media', label: 'Media & Photos', icon: ImageIcon },
  { id: 'advertising', label: 'Advertising & AI', icon: Sparkles },
  { id: 'enquiries', label: 'Enquiries', icon: Inbox },
  { id: 'deals', label: 'Deals', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'activity', label: 'Activity Timeline', icon: History },
]

const LIFECYCLE_STATUSES: { id: VehicleLifecycleStatus; label: string }[] = [
  { id: 'acquiring', label: 'Acquiring' },
  { id: 'purchased', label: 'Purchased' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'arrived', label: 'Arrived' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'preparation', label: 'Preparation' },
  { id: 'photography', label: 'Photography' },
  { id: 'ready_for_sale', label: 'Ready for Sale' },
  { id: 'available', label: 'Available' },
  { id: 'advertised', label: 'Advertised' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'sold', label: 'Sold' },
  { id: 'handover', label: 'Handover' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
]

interface VehicleHubProps {
  vehicle: VehicleRecord
  costs: any[]
  prepJobs: any[]
  documents: any[]
  statusHistory: any[]
  priceHistory: any[]
  leads: any[]
  deals: any[]
  locations: { id: string; name: string }[]
  teamMembers: { id: string; full_name: string }[]
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
  teamMembers = []
}: VehicleHubProps) {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<VehicleRecord>(initialVehicle)
  const [activeTab, setActiveTab] = useState('overview')
  const [costs, setCosts] = useState<any[]>(initialCosts)
  const [prepJobs, setPrepJobs] = useState<PrepJobRecord[]>(initialPrepJobs)
  
  // Status Change
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState<VehicleLifecycleStatus>(vehicle.status)
  
  // Price Update
  const [askingPrice, setAskingPrice] = useState(vehicle.asking_price || 0)
  const [isSavingPrice, setIsSavingPrice] = useState(false)

  // AI Description Generator State
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  const [advertHeadline, setAdvertHeadline] = useState(vehicle.advert_headline || '')
  const [advertDescription, setAdvertDescription] = useState(vehicle.advert_description || vehicle.description || '')
  const [isSavingAdvert, setIsSavingAdvert] = useState(false)

  // New Prep Job Modal State
  const [isAddingJob, setIsAddingJob] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [jobCategory, setJobCategory] = useState('mechanical')
  const [jobEstimatedCost, setJobEstimatedCost] = useState(0)
  const [jobSupplier, setJobSupplier] = useState('')
  const [jobDueDate, setJobDueDate] = useState('')

  // New Cost Entry State
  const [isAddingCost, setIsAddingCost] = useState(false)
  const [costCategory, setCostCategory] = useState('mechanical')
  const [costDesc, setCostDesc] = useState('')
  const [costAmount, setCostAmount] = useState(0)
  const [costSupplier, setCostSupplier] = useState('')
  const [costInvoiceRef, setCostInvoiceRef] = useState('')

  const comms = calculateCommercials(vehicle, costs)
  const readiness = checkAdvertisingReadiness(vehicle)
  const primaryPhoto = vehicle.vehicle_images?.find(img => img.is_primary)?.url || vehicle.photos?.[0]

  // Deterministic Alerts
  const alerts: { text: string; type: 'warning' | 'negative' | 'info' }[] = []
  if (['inspection', 'preparation', 'photography'].includes(vehicle.status) && comms.daysOwned > 7) {
    alerts.push({ text: `Vehicle has been in preparation pipeline for ${comms.daysOwned} days`, type: 'warning' })
  }
  if (!vehicle.asking_price || vehicle.asking_price <= 0) {
    alerts.push({ text: 'No retail asking price set', type: 'negative' })
  }
  if (!primaryPhoto) {
    alerts.push({ text: 'Missing vehicle photography for marketing channels', type: 'warning' })
  }
  if (comms.daysOwned > 45) {
    alerts.push({ text: `Ageing stock alert: ${comms.daysOwned} days in dealership inventory`, type: 'warning' })
  }

  const handleStatusChange = async (targetStatus: VehicleLifecycleStatus) => {
    setIsUpdatingStatus(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason: `Status moved to ${targetStatus}` }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = await res.json()
      setVehicle(prev => ({ ...prev, status: targetStatus }))
      setNewStatus(targetStatus)
      toast.success(`Status updated to ${targetStatus.replace(/_/g, ' ')}`)
      router.refresh()
    } catch {
      toast.error('Failed to change status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSavePrice = async () => {
    setIsSavingPrice(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asking_price: askingPrice, reason: 'Retail price updated' }),
      })
      if (!res.ok) throw new Error('Failed to update price')
      setVehicle(prev => ({ ...prev, asking_price: askingPrice }))
      toast.success('Retail price updated')
      router.refresh()
    } catch {
      toast.error('Failed to update price')
    } finally {
      setIsSavingPrice(false)
    }
  }

  const handleGenerateAIDescription = async () => {
    setIsGeneratingDesc(true)
    try {
      const res = await fetch('/api/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          spec: {
            make: vehicle.make,
            model: vehicle.model,
            variant: vehicle.variant,
            year: vehicle.year,
            mileage: vehicle.mileage,
            colour: vehicle.colour,
            fuel_type: vehicle.fuel_type,
            transmission: vehicle.transmission,
            body_type: vehicle.body_type,
            highlights: vehicle.highlights,
          }
        })
      })
      if (!res.ok) throw new Error('Failed to generate description')
      const data = await res.json()
      setAdvertDescription(data.description)
      toast.success('AI description generated')
    } catch (err: any) {
      toast.error(err.message || 'AI description generation unavailable')
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  const handleSaveAdvert = async () => {
    setIsSavingAdvert(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advert_headline: advertHeadline,
          advert_description: advertDescription,
          description: advertDescription,
        })
      })
      if (!res.ok) throw new Error('Failed to save advert')
      toast.success('Advert copy saved')
    } catch {
      toast.error('Failed to save advert')
    } finally {
      setIsSavingAdvert(false)
    }
  }

  const handleCreatePrepJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobTitle) return
    try {
      const res = await fetch('/api/prep-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          title: jobTitle,
          category: jobCategory,
          estimated_cost: jobEstimatedCost,
          supplier: jobSupplier,
          due_date: jobDueDate || null,
        })
      })
      if (!res.ok) throw new Error('Failed to create prep job')
      const created = await res.json()
      setPrepJobs(prev => [created, ...prev])
      setIsAddingJob(false)
      setJobTitle('')
      setJobEstimatedCost(0)
      toast.success('Preparation job created')
      router.refresh()
    } catch {
      toast.error('Failed to add preparation job')
    }
  }

  const handleCompletePrepJob = async (jobId: string, actualCost: number) => {
    try {
      const res = await fetch('/api/prep-jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status: 'completed',
          actual_cost: actualCost,
          completed_date: new Date().toISOString().split('T')[0]
        })
      })
      if (!res.ok) throw new Error('Failed to complete job')
      const updated = await res.json()
      setPrepJobs(prev => prev.map(j => j.id === jobId ? updated : j))
      toast.success('Job marked completed and costs updated')
      router.refresh()
    } catch {
      toast.error('Failed to complete job')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-void overflow-y-auto min-h-screen">
      
      {/* Top Header */}
      <div className="bg-carbon border-b border-steel px-6 py-5 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-2 text-pewter hover:text-cream">
              <Link href="/stock">
                <ArrowLeft size={16} /> STOCKBOOK
              </Link>
            </Button>

            <div className="h-6 w-px bg-steel hidden sm:block" />

            <div className="flex items-center gap-3">
              <span className="font-mono text-[14px] font-black text-cream bg-void border border-steel px-2.5 py-1 rounded-[2px] tracking-wider">
                {formatRegistration(vehicle.registration)}
              </span>
              <div>
                <h1 className="font-syne font-bold text-xl text-cream tracking-tight truncate max-w-md">
                  <span className="text-silver mr-1.5">{vehicle.year}</span>
                  {vehicle.make} {vehicle.model}
                </h1>
                <p className="font-inter text-xs text-silver truncate max-w-md">{vehicle.variant}</p>
              </div>
            </div>
          </div>

          {/* Quick Commercial Indicators & Status Progression */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right pr-4 border-r border-steel">
              <p className="font-mono text-[10px] text-pewter uppercase tracking-widest">Retail Price</p>
              <p className="font-mono text-lg font-bold text-cream leading-tight">
                {vehicle.asking_price > 0 ? formatCurrency(vehicle.asking_price) : '£—'}
              </p>
            </div>

            <div className="text-right pr-4 border-r border-steel">
              <p className="font-mono text-[10px] text-pewter uppercase tracking-widest">Gross Margin</p>
              <p className={cn(
                "font-mono text-lg font-bold leading-tight",
                comms.projectedGrossMargin > 0 ? "text-positive" : "text-negative"
              )}>
                {formatCurrency(comms.projectedGrossMargin)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => handleStatusChange(e.target.value as VehicleLifecycleStatus)}
                disabled={isUpdatingStatus}
                className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-[11px] text-cream uppercase font-bold focus:border-blue"
              >
                {LIFECYCLE_STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto border-b border-steel mt-6 pt-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "font-mono text-[11px] uppercase tracking-wider pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "text-cream border-blue font-bold"
                    : "text-pewter border-transparent hover:text-silver"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6 max-w-[1500px] mx-auto w-full flex-1">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Deterministic Alerts Banner */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                {alerts.map((alt, idx) => (
                  <div key={idx} className={cn(
                    "p-3.5 border rounded-[2px] flex items-center gap-3 font-inter text-xs",
                    alt.type === 'negative' ? "bg-negative/10 border-negative/40 text-negative font-medium" :
                    alt.type === 'warning' ? "bg-warning/10 border-warning/40 text-warning font-medium" :
                    "bg-blue/10 border-blue/40 text-cream"
                  )}>
                    <AlertTriangle size={15} />
                    <span>{alt.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Commercial & Operational Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Commercial Economics */}
              <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
                <h2 className="font-syne font-bold text-lg text-cream">Commercial Economics</h2>
                
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-silver">
                    <span>Purchase Price (Hammer):</span>
                    <span>{formatCurrency(vehicle.purchase_price)}</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Auction / Sourcing Fees:</span>
                    <span>{formatCurrency(vehicle.auction_fee)}</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Transport / Logistics:</span>
                    <span>{formatCurrency(vehicle.transport_cost)}</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Preparation Costs:</span>
                    <span>{formatCurrency(vehicle.prep_cost)}</span>
                  </div>
                  {costs.length > 0 && (
                    <div className="flex justify-between text-silver">
                      <span>Ledger Expenses ({costs.length}):</span>
                      <span>{formatCurrency(costs.reduce((acc, c) => acc + Number(c.amount || 0), 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-cream font-bold pt-3 border-t border-steel">
                    <span>Total Invested Cost:</span>
                    <span>{formatCurrency(comms.totalInvestedCost)}</span>
                  </div>
                  <div className="flex justify-between text-cream font-bold">
                    <span>Retail Asking Price:</span>
                    <span>{formatCurrency(vehicle.asking_price)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-steel text-sm">
                    <span className="text-cream">Projected Gross Margin:</span>
                    <span className={comms.projectedGrossMargin > 0 ? "text-positive" : "text-negative"}>
                      {formatCurrency(comms.projectedGrossMargin)} ({comms.projectedMarginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-steel flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={askingPrice} 
                    onChange={(e) => setAskingPrice(Number(e.target.value))}
                    className="h-9 font-mono text-sm bg-asphalt" 
                  />
                  <Button size="sm" onClick={handleSavePrice} disabled={isSavingPrice} className="gap-2">
                    <Save size={14} /> UPDATE PRICE
                  </Button>
                </div>
              </div>

              {/* Operational & Lifecycle */}
              <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
                <h2 className="font-syne font-bold text-lg text-cream">Operational Status</h2>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-silver">
                    <span>Lifecycle State:</span>
                    <Badge variant="outline" className="uppercase">{vehicle.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Days in Dealership:</span>
                    <span className="text-cream font-bold">{comms.daysOwned} days</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Location:</span>
                    <span className="text-cream">{vehicle.dealership_locations?.name || 'Main Forecourt'}</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Assigned Buyer / User:</span>
                    <span className="text-cream">{vehicle.profiles?.full_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Purchase Date:</span>
                    <span>{vehicle.purchase_date ? format(new Date(vehicle.purchase_date), 'dd MMM yyyy') : '—'}</span>
                  </div>
                  <div className="flex justify-between text-silver">
                    <span>Advertising Status:</span>
                    {readiness.isReady ? (
                      <span className="text-positive font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> READY
                      </span>
                    ) : (
                      <span className="text-warning font-bold flex items-center gap-1">
                        <AlertTriangle size={13} /> INCOMPLETE
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-steel flex gap-2">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href="/stock/preparation">GO TO PREP BOARD</Link>
                  </Button>
                </div>
              </div>

              {/* Quick Image Preview & Primary Spec */}
              <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4 flex flex-col justify-between">
                <div>
                  <h2 className="font-syne font-bold text-lg text-cream mb-3">Primary Photography</h2>
                  <div className="aspect-[16/10] bg-asphalt rounded-[2px] border border-steel overflow-hidden flex items-center justify-center">
                    {primaryPhoto ? (
                      <img src={primaryPhoto} alt={vehicle.registration} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-pewter">
                        <ImageIcon size={36} className="mx-auto mb-1" />
                        <span className="font-mono text-xs">No Primary Photo</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => setActiveTab('media')} className="w-full gap-2">
                  <ImageIcon size={14} /> MANAGE PHOTOS ({vehicle.vehicle_images?.length || vehicle.photos?.length || 0})
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: VEHICLE SPECS */}
        {activeTab === 'specs' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">Technical & Condition Specifications</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'REGISTRATION', value: formatRegistration(vehicle.registration) },
                { label: 'VIN NUMBER', value: vehicle.vin || '—' },
                { label: 'MAKE', value: vehicle.make },
                { label: 'MODEL', value: vehicle.model },
                { label: 'VARIANT', value: vehicle.variant || '—' },
                { label: 'YEAR', value: vehicle.year },
                { label: 'MILEAGE', value: `${vehicle.mileage.toLocaleString()} mi` },
                { label: 'COLOUR', value: vehicle.colour || '—' },
                { label: 'FUEL TYPE', value: vehicle.fuel_type || '—' },
                { label: 'TRANSMISSION', value: vehicle.transmission || '—' },
                { label: 'BODY STYLE', value: vehicle.body_type || '—' },
                { label: 'DOORS', value: vehicle.doors || '—' },
                { label: 'ENGINE SIZE', value: vehicle.engine_size || '—' },
                { label: 'KEYS COUNT', value: vehicle.keys_count || 2 },
                { label: 'SERVICE HISTORY', value: vehicle.service_history_type || 'Full' },
                { label: 'HPI STATUS', value: vehicle.hpi_status || 'Clear' },
                { label: 'MOT EXPIRY', value: vehicle.mot_expiry_date || vehicle.mot_expiry ? format(new Date(vehicle.mot_expiry_date || vehicle.mot_expiry!), 'dd MMM yyyy') : '—' },
                { label: 'BODYWORK', value: vehicle.body_condition || 'Good' },
                { label: 'WHEELS', value: vehicle.wheel_condition || 'Good' },
                { label: 'TYRES', value: vehicle.tyre_condition || 'Good' },
              ].map((item, idx) => (
                <div key={idx} className="border-b border-steel/60 pb-3">
                  <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="font-inter font-medium text-sm text-cream">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ACQUISITION */}
        {activeTab === 'acquisition' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">Acquisition Record</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Purchase Source</p>
                <p className="font-inter font-medium text-sm text-cream capitalize">{vehicle.purchase_source?.replace(/_/g, ' ') || 'Auction'}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Supplier / Vendor</p>
                <p className="font-inter font-medium text-sm text-cream">{vehicle.supplier_name || vehicle.auction_house || '—'}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Purchase Date</p>
                <p className="font-inter font-medium text-sm text-cream">
                  {vehicle.purchase_date ? format(new Date(vehicle.purchase_date), 'dd MMM yyyy') : '—'}
                </p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Purchase Reference</p>
                <p className="font-inter font-medium text-sm text-cream">{vehicle.purchase_reference || '—'}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Hammer Price</p>
                <p className="font-mono font-bold text-sm text-cream">{formatCurrency(vehicle.purchase_price)}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Auction & Buyer Fees</p>
                <p className="font-mono font-bold text-sm text-cream">{formatCurrency(vehicle.auction_fee)}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Transport Incurred</p>
                <p className="font-mono font-bold text-sm text-cream">{formatCurrency(vehicle.transport_cost)}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Other Acquisition Costs</p>
                <p className="font-mono font-bold text-sm text-cream">{formatCurrency(vehicle.other_acquisition_costs)}</p>
              </div>

              <div className="border-b border-steel/60 pb-3">
                <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Funding Method</p>
                <p className="font-inter font-medium text-sm text-cream">{vehicle.funding_source || 'Own Working Capital'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PREPARATION */}
        {activeTab === 'preparation' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-syne font-bold text-xl text-cream">Preparation Management</h2>
                <p className="font-inter text-xs text-silver mt-0.5">Workshop, bodywork, valeting and inspection jobs.</p>
              </div>
              <Button onClick={() => setIsAddingJob(!isAddingJob)} className="gap-2">
                <Plus size={14} /> NEW PREP JOB
              </Button>
            </div>

            {/* Create Job Form */}
            {isAddingJob && (
              <form onSubmit={handleCreatePrepJob} className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
                <h3 className="font-syne font-bold text-base text-cream">Create Preparation Task</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Job Title *</label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Alloy Wheel Refurb (Front Offside)" required />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Category</label>
                    <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 text-sm text-cream">
                      <option value="mechanical">Mechanical</option>
                      <option value="service">Service</option>
                      <option value="mot">MOT</option>
                      <option value="alloy_wheel">Alloy Wheel</option>
                      <option value="bodywork">Bodywork / Dent</option>
                      <option value="smart_repair">SMART Repair</option>
                      <option value="valeting">Valet & Detail</option>
                      <option value="photography">Photography</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Estimated Cost (£)</label>
                    <Input type="number" value={jobEstimatedCost} onChange={(e) => setJobEstimatedCost(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Supplier / Bay</label>
                    <Input value={jobSupplier} onChange={(e) => setJobSupplier(e.target.value)} placeholder="e.g. In-house Valet Bay" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Due Date</label>
                    <Input type="date" value={jobDueDate} onChange={(e) => setJobDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsAddingJob(false)}>Cancel</Button>
                  <Button type="submit">CREATE JOB</Button>
                </div>
              </form>
            )}

            {/* Jobs List */}
            <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Supplier / Bay</th>
                    <th className="py-3 px-4 text-right">Est. Cost</th>
                    <th className="py-3 px-4 text-right">Actual Cost</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prepJobs.length > 0 ? prepJobs.map(job => (
                    <tr key={job.id} className="border-b border-steel/60 hover:bg-asphalt/50">
                      <td className="py-3.5 px-4 font-inter text-sm font-medium text-cream">{job.title}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-silver capitalize">{job.category.replace(/_/g, ' ')}</td>
                      <td className="py-3.5 px-4 font-inter text-xs text-silver">{job.supplier || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-right text-silver">{formatCurrency(job.estimated_cost)}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-right font-bold text-cream">{formatCurrency(job.actual_cost)}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-silver">{job.due_date ? format(new Date(job.due_date), 'dd MMM yyyy') : '—'}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={job.status === 'completed' ? 'positive' : job.status === 'in_progress' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {job.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => handleCompletePrepJob(job.id, job.actual_cost || job.estimated_cost || 0)} className="text-[11px] h-7">
                            COMPLETE
                          </Button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-pewter font-inter text-sm">
                        No preparation tasks scheduled for this vehicle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: COSTS LEDGER */}
        {activeTab === 'costs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-syne font-bold text-xl text-cream">Vehicle Cost Ledger</h2>
                <p className="font-inter text-xs text-silver mt-0.5">Granular record of all vehicle acquisition, preparation and logistics expenses.</p>
              </div>
              <Button onClick={() => setIsAddingCost(!isAddingCost)} className="gap-2">
                <Plus size={14} /> LOG EXPENSE
              </Button>
            </div>

            <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Incurred Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Standard Acquisition Costs */}
                  <tr className="border-b border-steel/60 bg-asphalt/20">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-blue">PURCHASE</td>
                    <td className="py-3 px-4 font-inter text-xs text-cream">Vehicle Acquisition Hammer Price</td>
                    <td className="py-3 px-4 font-inter text-xs text-silver">{vehicle.supplier_name || '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-silver">{vehicle.purchase_reference || '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-silver">{vehicle.purchase_date || '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-right font-bold text-cream">{formatCurrency(vehicle.purchase_price)}</td>
                  </tr>

                  {vehicle.auction_fee > 0 && (
                    <tr className="border-b border-steel/60">
                      <td className="py-3 px-4 font-mono text-xs text-silver">FEE</td>
                      <td className="py-3 px-4 font-inter text-xs text-cream">Auction & Buyer Indorsement Fee</td>
                      <td className="py-3 px-4 font-inter text-xs text-silver">{vehicle.supplier_name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-silver">—</td>
                      <td className="py-3 px-4 font-mono text-xs text-silver">{vehicle.purchase_date || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-right font-bold text-cream">{formatCurrency(vehicle.auction_fee)}</td>
                    </tr>
                  )}

                  {vehicle.transport_cost > 0 && (
                    <tr className="border-b border-steel/60">
                      <td className="py-3 px-4 font-mono text-xs text-silver">LOGISTICS</td>
                      <td className="py-3 px-4 font-inter text-xs text-cream">Vehicle Transport & Delivery</td>
                      <td className="py-3 px-4 font-inter text-xs text-silver">—</td>
                      <td className="py-3 px-4 font-mono text-xs text-silver">—</td>
                      <td className="py-3 px-4 font-mono text-xs text-silver">{vehicle.purchase_date || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-right font-bold text-cream">{formatCurrency(vehicle.transport_cost)}</td>
                    </tr>
                  )}

                  {costs.map(c => (
                    <tr key={c.id} className="border-b border-steel/60">
                      <td className="py-3 px-4 font-mono text-xs text-silver uppercase">{c.category}</td>
                      <td className="py-3 px-4 font-inter text-xs text-cream">{c.description || '—'}</td>
                      <td className="py-3 px-4 font-inter text-xs text-silver">{c.supplier_name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-silver">{c.invoice_reference || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-silver">{c.incurred_date ? format(new Date(c.incurred_date), 'dd MMM yyyy') : '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-right font-bold text-cream">{formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-asphalt border-t border-steel flex justify-between items-center font-mono text-sm">
                <span className="font-bold text-cream uppercase">Total Invested Vehicle Capital:</span>
                <span className="text-xl font-bold text-cream">{formatCurrency(comms.totalInvestedCost)}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MEDIA & PHOTOS */}
        {activeTab === 'media' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="font-syne font-bold text-xl text-cream">Vehicle Media & Photos</h2>
              <p className="font-inter text-xs text-silver mt-0.5">High-resolution forecourt imagery saved directly to Supabase storage.</p>
            </div>

            <PhotoUploader vehicleId={vehicle.id} />
          </div>
        )}

        {/* TAB 7: ADVERTISING & AI */}
        {activeTab === 'advertising' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            {/* Advertising Readiness Checklist */}
            <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-syne font-bold text-lg text-cream">Advertising Readiness</h2>
                <Badge variant={readiness.isReady ? "positive" : "warning"} className="uppercase font-mono">
                  {readiness.isReady ? "READY TO ADVERTISE" : "ACTION REQUIRED"}
                </Badge>
              </div>

              {!readiness.isReady && (
                <div className="bg-asphalt border border-steel p-4 rounded-[2px] space-y-2">
                  <p className="font-mono text-xs text-warning uppercase font-bold">Missing Required Portal Fields:</p>
                  <ul className="list-disc list-inside text-xs text-silver space-y-1">
                    {readiness.missingItems.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Copy Generator */}
            <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-bold text-lg text-cream flex items-center gap-2">
                    <Sparkles className="text-blue" size={18} /> IQ Create — Vehicle Description
                  </h3>
                  <p className="font-inter text-xs text-silver mt-0.5">
                    Generate factual, engaging copy from vehicle specifications using Anthropic Claude.
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateAIDescription} 
                  disabled={isGeneratingDesc}
                  className="gap-2"
                >
                  {isGeneratingDesc ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  GENERATE WITH IQ CREATE
                </Button>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Headline</label>
                  <Input 
                    value={advertHeadline} 
                    onChange={(e) => setAdvertHeadline(e.target.value)} 
                    placeholder="e.g. Exceptional BMW 330e M Sport Pro Saloon in Mineral Grey"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Advert Copy</label>
                  <textarea
                    rows={8}
                    value={advertDescription}
                    onChange={(e) => setAdvertDescription(e.target.value)}
                    className="w-full bg-asphalt border border-steel rounded-[2px] p-4 text-sm text-cream leading-relaxed focus:border-blue resize-none font-inter"
                    placeholder="Vehicle description will appear here..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAdvert} disabled={isSavingAdvert} className="gap-2">
                    <Save size={14} /> SAVE ADVERT DETAILS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ENQUIRIES */}
        {activeTab === 'enquiries' && (
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 border-b border-steel flex justify-between items-center">
              <h2 className="font-syne font-bold text-lg text-cream">Customer Enquiries & Leads</h2>
              <Badge variant="outline">{leads.length} LEADS</Badge>
            </div>
            {leads.length > 0 ? (
              <div className="divide-y divide-steel">
                {leads.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="p-4 flex items-center justify-between hover:bg-asphalt transition-colors block">
                    <div>
                      <p className="font-inter text-sm font-medium text-cream">{lead.first_name} {lead.last_name}</p>
                      <p className="font-mono text-[11px] text-pewter mt-0.5">{format(new Date(lead.created_at), 'dd MMM yyyy HH:mm')}</p>
                    </div>
                    <Badge variant={lead.status === 'won' ? 'positive' : 'outline'}>{lead.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-pewter font-inter text-sm">
                No customer enquiries logged against this vehicle yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 9: DEALS */}
        {activeTab === 'deals' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream mb-4">Deal Desk Proposals</h2>
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map(d => (
                  <div key={d.id} className="p-4 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center">
                    <div>
                      <p className="font-mono text-sm font-bold text-cream">DEAL #{d.deal_number}</p>
                      <p className="font-inter text-xs text-silver">Status: {d.status}</p>
                    </div>
                    <p className="font-mono text-base font-bold text-positive">{formatCurrency(d.sale_price)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-inter text-sm text-pewter text-center py-8">
                No active deal desk transactions for this vehicle.
              </p>
            )}
          </div>
        )}

        {/* TAB 10: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h2 className="font-syne font-bold text-lg text-cream">Vehicle Documents</h2>
              <Button size="sm" className="gap-2"><Plus size={14} /> ATTACH DOCUMENT</Button>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="p-3 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center">
                    <div>
                      <p className="font-inter text-sm font-medium text-cream">{doc.filename}</p>
                      <p className="font-mono text-[10px] text-pewter uppercase">{doc.document_type}</p>
                    </div>
                    <Button variant="ghost" size="sm">DOWNLOAD</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-pewter font-inter text-sm">
                No compliance or purchase invoices uploaded for this vehicle.
              </div>
            )}
          </div>
        )}

        {/* TAB 11: ACTIVITY TIMELINE */}
        {activeTab === 'activity' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-6 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">Operational History & Audit Log</h2>

            <div className="space-y-4">
              {statusHistory.map((sh, i) => (
                <div key={i} className="flex gap-4 items-start pb-4 border-b border-steel/60">
                  <div className="w-2 h-2 rounded-full bg-blue mt-1.5 shrink-0" />
                  <div>
                    <p className="font-inter text-sm text-cream font-medium">
                      Status changed to <span className="font-mono font-bold uppercase">{sh.to_status}</span>
                    </p>
                    <p className="font-mono text-[11px] text-pewter mt-0.5">
                      {format(new Date(sh.created_at), 'dd MMM yyyy HH:mm')} · {sh.reason || 'Operational workflow'}
                    </p>
                  </div>
                </div>
              ))}

              {priceHistory.map((ph, i) => (
                <div key={i} className="flex gap-4 items-start pb-4 border-b border-steel/60">
                  <div className="w-2 h-2 rounded-full bg-positive mt-1.5 shrink-0" />
                  <div>
                    <p className="font-inter text-sm text-cream font-medium">
                      Retail price updated to <span className="font-mono font-bold">{formatCurrency(ph.new_price)}</span>
                    </p>
                    <p className="font-mono text-[11px] text-pewter mt-0.5">
                      {format(new Date(ph.created_at), 'dd MMM yyyy HH:mm')} · {ph.reason || 'Price adjustment'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
